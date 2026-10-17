import type { UserAvailabilityException, UserWeeklyAvailability } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { toDateOnlyString } from "../../shared/utils/date";
import { logger } from "../../shared/logging/logger";
import {
  findAvailabilityException,
  isWithinWeeklyAvailability,
  toLocalAvailabilityInfo,
  resolveAvailabilityFromException,
  type AvailabilityClient,
  type LocalAvailabilityInfo,
} from "./availability.shared";
import { getEventCoachWeeklyAvailability } from "./availabilityCalendar.service";
import { getCoachConflicts, type BookingWithEventBuffer } from "./availabilityConflict.service";

/**
 * Coach availability evaluation, split out of availability.service so that BOTH
 * availability.service (slot listing) and eventScheduling.service (coach selection) can
 * depend on it without depending on each other. It may import only leaf modules
 * (availability.shared, availabilityConflict, availabilityCalendar, shared/*) — never
 * availability.service or anything in events/.
 */

function toNextDateString(dateString: string): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return toDateOnlyString(next);
}

/**
 * Checks availability for a session that spans the coach's local midnight by
 * splitting the session at midnight and verifying each half independently:
 *   - Day 1: start → 23:59 must be covered by availability
 *   - Day 2: 00:00 → end must be covered by availability
 */
function isCoachAvailableAcrossMidnight(
  startTime: Date,
  endTime: Date,
  calendar: { weekly: UserWeeklyAvailability[]; exceptions: UserAvailabilityException[] },
  timezone: string,
): boolean {
  const startLocal = toLocalAvailabilityInfo(startTime, timezone);
  const endLocal = toLocalAvailabilityInfo(endTime, timezone);
  const day2DateString = toNextDateString(startLocal.dateString);
  const day2DayOfWeek = (startLocal.dayOfWeek + 1) % 7;

  const beforeMidnight: LocalAvailabilityInfo = {
    hhmm: "23:59",
    dayOfWeek: startLocal.dayOfWeek,
    dateString: startLocal.dateString,
  };
  const atMidnight: LocalAvailabilityInfo = {
    hhmm: "00:00",
    dayOfWeek: day2DayOfWeek,
    dateString: day2DateString,
  };

  // Day 1: start → 23:59
  const day1Exception = findAvailabilityException(calendar.exceptions, startLocal.dateString);
  const day1ExceptionResult = resolveAvailabilityFromException(
    day1Exception,
    startLocal,
    beforeMidnight,
  );
  if (day1ExceptionResult === false) return false;
  if (
    day1ExceptionResult === null &&
    !isWithinWeeklyAvailability(calendar.weekly, startLocal, beforeMidnight)
  ) {
    return false;
  }

  // Day 2: 00:00 → end
  const day2Exception = findAvailabilityException(calendar.exceptions, day2DateString);
  const day2ExceptionResult = resolveAvailabilityFromException(day2Exception, atMidnight, endLocal);
  if (day2ExceptionResult === false) return false;
  if (
    day2ExceptionResult === null &&
    !isWithinWeeklyAvailability(calendar.weekly, atMidnight, endLocal)
  ) {
    return false;
  }

  return true;
}

/**
 * Why a coach is not available for a given slot. Surfaced by
 * `evaluateCoachAvailability` for the admin slot-debug tool. The booking path
 * itself only cares about the boolean (see `isCoachAvailable`).
 */
export type CoachUnavailabilityReason =
  | "conflict"
  | "exception_block"
  | "outside_availability"
  | "invalid_timezone";

/**
 * Result of an availability evaluation: the boolean the booking path uses, plus
 * the reason (and, for conflicts, the first blocking booking) used by the
 * admin slot-debug report.
 */
export type CoachAvailabilityResult = {
  available: boolean;
  reason: CoachUnavailabilityReason | null;
  /** Populated only when `reason === "conflict"`: the first blocking booking. */
  conflict?: BookingWithEventBuffer;
};

const AVAILABLE: CoachAvailabilityResult = { available: true, reason: null };

const unavailable = (
  reason: CoachUnavailabilityReason,
  conflict?: BookingWithEventBuffer,
): CoachAvailabilityResult => ({ available: false, reason, conflict });

/**
 * Single source of truth for coach availability. Returns whether the coach is
 * free for `[startTime, endTime]` and, when not, the reason (conflict, exception
 * block, outside weekly window, or invalid timezone).
 *
 * `isCoachAvailable` is a thin wrapper that discards the reason — the booking
 * path only needs the boolean. The admin slot-debug service consumes the full
 * result so the two never drift apart.
 *
 * Decision order: booking conflicts → invalid-timezone guard → cross-midnight
 * split → one-off exception override → weekly availability fallback.
 */
export const evaluateCoachAvailability = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  options: {
    ignoreWeeklySchedule?: boolean;
    eventId?: string;
    weeklyOverride?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
    scheduleSlotId?: string | null;
    tx?: AvailabilityClient;
    bufferAfterMinutes?: number;
    /** Pre-fetched coach timezone — skips user.findUnique when provided. */
    timezone?: string;
    /** Pre-fetched calendar data — skips getEffectiveAvailability when provided. */
    calendarData?: { weekly: UserWeeklyAvailability[]; exceptions: UserAvailabilityException[] };
    /** Pre-fetched conflicts already filtered for this slot — skips getCoachConflicts when provided. */
    prefetchedConflicts?: BookingWithEventBuffer[];
    /** Excludes this booking's own record from the conflict check — see getCoachConflicts. */
    excludeBookingId?: string;
  } = {},
): Promise<CoachAvailabilityResult> => {
  const client: AvailabilityClient = options.tx || prisma;

  // 1. Resolve Coach and Calendar Data
  let resolvedTimezone: string;
  if (options.timezone !== undefined) {
    resolvedTimezone = options.timezone;
  } else {
    const user = await client.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    });
    if (!user) return unavailable("invalid_timezone");
    resolvedTimezone = user.timezone;
  }

  const effectiveEndTime = options.bufferAfterMinutes
    ? new Date(endTime.getTime() + options.bufferAfterMinutes * 60 * 1000)
    : endTime;

  // Calendar data is fetched via `client` (not the getEffectiveAvailability facade,
  // which always uses the global prisma client). When this runs inside a booking
  // transaction that already holds a row lock, a global-client query would need a
  // SECOND pool connection — under bursty load every pool connection is held by
  // requests queued on that same lock, deadlocking the pool until timeouts fire.
  const [calendar, conflicts] = await Promise.all([
    options.calendarData
      ? Promise.resolve(options.calendarData)
      : Promise.all([
          // Weekly rows are provably unused when ignoreWeeklySchedule (FIXED_SLOTS):
          // both the cross-midnight branch and the weekly fallback return before
          // reading them. Only exceptions matter there — skip the dead query.
          options.ignoreWeeklySchedule
            ? Promise.resolve([] as UserWeeklyAvailability[])
            : client.userWeeklyAvailability.findMany({ where: { userId } }),
          // Exception dates are midnight-UTC timestamps matched against the session's
          // LOCAL calendar day (dateString comparison). A [start, end] range misses the
          // midnight anchor for any session not starting at 00:00 UTC — widen by 48h
          // each side to cover every IANA offset plus cross-midnight sessions.
          client.userAvailabilityException.findMany({
            where: {
              userId,
              date: {
                gte: new Date(startTime.getTime() - 48 * 60 * 60 * 1000),
                lte: new Date(effectiveEndTime.getTime() + 48 * 60 * 60 * 1000),
              },
            },
          }),
        ]).then(([weekly, exceptions]) => ({ weekly, exceptions })),
    options.prefetchedConflicts
      ? Promise.resolve(options.prefetchedConflicts)
      : getCoachConflicts(userId, startTime, effectiveEndTime, options),
  ]);

  // 2. Conflict Check (Bookings)
  if (conflicts.length > 0) {
    return unavailable("conflict", conflicts[0]);
  }

  // 3. Resolve effective weekly schedule: event-specific override takes priority over global.
  // Exceptions (vacations/holidays) always apply regardless of which weekly source is used.
  // When called from getAvailableSlots, weeklyOverride is pre-fetched once per coach to
  // avoid N+1 queries across the slot generation loop.
  let effectiveCalendar = calendar;
  if (!options.ignoreWeeklySchedule) {
    const overrideSlots =
      options.weeklyOverride !== undefined
        ? options.weeklyOverride
        : options.eventId
          ? await getEventCoachWeeklyAvailability(options.eventId, userId)
          : [];
    if (overrideSlots.length > 0) {
      effectiveCalendar = {
        ...calendar,
        weekly: overrideSlots.map(({ dayOfWeek, startTime, endTime }) => ({
          dayOfWeek,
          startTime,
          endTime,
        })) as UserWeeklyAvailability[],
      };
    }
  }

  // 4. Exception Decision (Overrides)
  let startLocal: LocalAvailabilityInfo;
  let endLocal: LocalAvailabilityInfo;
  try {
    startLocal = toLocalAvailabilityInfo(startTime, resolvedTimezone);
    endLocal = toLocalAvailabilityInfo(effectiveEndTime, resolvedTimezone);
  } catch {
    logger.warn(
      { userId, timezone: resolvedTimezone },
      "Invalid coach timezone — treating as unavailable.",
    );
    return unavailable("invalid_timezone");
  }

  if (startLocal.dateString !== endLocal.dateString) {
    if (options.ignoreWeeklySchedule) return AVAILABLE;
    return isCoachAvailableAcrossMidnight(
      startTime,
      effectiveEndTime,
      effectiveCalendar,
      resolvedTimezone,
    )
      ? AVAILABLE
      : unavailable("outside_availability");
  }

  const dayException = findAvailabilityException(
    effectiveCalendar.exceptions,
    startLocal.dateString,
  );
  const exceptionDecision = resolveAvailabilityFromException(dayException, startLocal, endLocal);

  if (exceptionDecision !== null) {
    return exceptionDecision ? AVAILABLE : unavailable("exception_block");
  }

  // 5. Weekly Schedule Fallback
  if (options.ignoreWeeklySchedule) {
    return AVAILABLE;
  }

  return isWithinWeeklyAvailability(effectiveCalendar.weekly, startLocal, endLocal)
    ? AVAILABLE
    : unavailable("outside_availability");
};

/**
 * Thin boolean wrapper over `evaluateCoachAvailability` for the booking path.
 * Signature and semantics are unchanged from the original implementation.
 */
export const isCoachAvailable = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  options: Parameters<typeof evaluateCoachAvailability>[3] = {},
): Promise<boolean> => {
  return (await evaluateCoachAvailability(userId, startTime, endTime, options)).available;
};

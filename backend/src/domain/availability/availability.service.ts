import {
  EventBookingMode,
  Prisma,
  UserAvailabilityException,
  UserRole,
  UserWeeklyAvailability,
} from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { toDateOnlyString } from "../../shared/utils/date";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  findAvailabilityException,
  isWithinWeeklyAvailability,
  toLocalAvailabilityInfo,
  resolveAvailabilityFromException,
  type AvailabilityClient,
  type LocalAvailabilityInfo,
} from "./availability.shared";
import { type SafeEvent } from "../events/event.shared";
import {
  assertBookingNoticeSatisfied,
  getEffectiveParticipantPolicy,
  replenishContinuousSlots,
} from "../events/eventScheduling.service";
import {
  getWeeklyAvailability,
  setWeeklyAvailability,
  getAvailabilityExceptions,
  addAvailabilityException,
  removeAvailabilityException,
  getEffectiveAvailabilityData as getEffectiveAvailability,
  getEventCoachWeeklyAvailability,
} from "./availabilityCalendar.service";
import {
  getCoachConflicts,
  filterConflictsForSlot,
  type BookingWithEventBuffer,
} from "./availabilityConflict.service";
import { logger } from "../../shared/logging/logger";

/**
 * Facade service for availability lookups.
 * Orchestrates calendar data (weekly/exceptions) and booking conflicts.
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
 * Computes the end-of-day boundary (23:59:59.999) for today + daysAhead in the
 * given IANA timezone using a two-pass approach, mirroring the frontend's
 * startOfDayInTimezone utility. Falls back to UTC arithmetic if timezone is
 * invalid so booking-window enforcement degrades gracefully.
 */
function endOfBookingWindowInTimezone(timezone: string, daysAhead: number): Date {
  try {
    const now = Date.now();
    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(now));
    const get = (type: string) =>
      parseInt(dateParts.find((p) => p.type === type)?.value ?? "0", 10);
    const year = get("year");
    const month = get("month") - 1; // 0-indexed for Date.UTC
    const day = get("day");

    // Target: start of (today + daysAhead + 1) in the student's TZ, minus 1ms
    const targetDay = day + daysAhead + 1;
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parseHMS = (ms: number) => {
      const parts = fmt.formatToParts(new Date(ms));
      const g = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
      return { h: g("hour") % 24, m: g("minute"), s: g("second") };
    };

    let utcMs = Date.UTC(year, month, targetDay, 12, 0, 0);
    const { h: h1, m: m1, s: s1 } = parseHMS(utcMs);
    utcMs -= (h1 * 3600 + m1 * 60 + s1) * 1000;
    const { h: h2, m: m2, s: s2 } = parseHMS(utcMs);
    if (h2 !== 0 || m2 !== 0 || s2 !== 0) {
      if (h2 > 12) utcMs += (24 - h2) * 3_600_000 - m2 * 60_000 - s2 * 1000;
      else utcMs -= (h2 * 3600 + m2 * 60 + s2) * 1000;
    }
    return new Date(utcMs - 1); // 1ms before next-day midnight = end of window day
  } catch {
    // Invalid timezone — fall back to UTC arithmetic
    const windowEnd = new Date();
    windowEnd.setUTCDate(windowEnd.getUTCDate() + daysAhead);
    windowEnd.setUTCHours(23, 59, 59, 999);
    return windowEnd;
  }
}

const availabilityEventInclude = Prisma.validator<Prisma.EventInclude>()({
  scheduleSlots: {
    where: {
      isActive: true,
    },
    orderBy: { startTime: "asc" },
  },
  coaches: {
    where: { isActive: true },
    orderBy: { coachOrder: "asc" },
  },
});

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
const evaluateCoachAvailability = async (
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

  const [calendar, conflicts] = await Promise.all([
    options.calendarData
      ? Promise.resolve(options.calendarData)
      : getEffectiveAvailability(userId, startTime, effectiveEndTime, {
          id: userId,
          role: UserRole.COACH,
        }),
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
    logger.warn({ userId, timezone: resolvedTimezone }, "Invalid coach timezone — treating as unavailable.");
    return unavailable("invalid_timezone");
  }

  if (startLocal.dateString !== endLocal.dateString) {
    if (options.ignoreWeeklySchedule) return AVAILABLE;
    return isCoachAvailableAcrossMidnight(startTime, effectiveEndTime, effectiveCalendar, resolvedTimezone)
      ? AVAILABLE
      : unavailable("outside_availability");
  }

  const dayException = findAvailabilityException(effectiveCalendar.exceptions, startLocal.dateString);
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
const isCoachAvailable = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  options: Parameters<typeof evaluateCoachAvailability>[3] = {},
): Promise<boolean> => {
  return (await evaluateCoachAvailability(userId, startTime, endTime, options)).available;
};

export type AvailableSlot = {
  startTime: string;
  endTime: string;
  scheduleSlotId?: string;
  remainingSeats?: number | null;
  maxSeats?: number | null;
  assignedCoach?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
};

const getAvailableSlots = async (
  eventId: string,
  startDate: Date,
  endDate: Date,
  preferredCoachId?: string,
  studentTimezone?: string,
): Promise<AvailableSlot[]> => {
  // Replenish continuous slots first
  await replenishContinuousSlots(eventId);

  const eventResult = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      ...availabilityEventInclude,
      scheduleSlots: {
        where: {
          isActive: true,
          startTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          assignedCoach: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        } as any,
        orderBy: { startTime: "asc" },
      },
    },
  });

  if (!eventResult || eventResult.coaches.length === 0) {
    return [];
  }

  // Enforce booking window if set.
  // When studentTimezone is provided, anchor the window boundary to the end of
  // day in the student's timezone so UTC±12 users are not off by a day.
  // Falls back to UTC arithmetic (matching the frontend's SlotStep.tsx behaviour)
  // when studentTimezone is absent or invalid.
  let effectiveMaxDate = endDate;
  const event = eventResult as any;
  if (event.maxBookingWindowDays != null) {
    const windowEnd = studentTimezone
      ? endOfBookingWindowInTimezone(studentTimezone, event.maxBookingWindowDays)
      : (() => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() + event.maxBookingWindowDays);
          d.setUTCHours(23, 59, 59, 999);
          return d;
        })();

    if (windowEnd < effectiveMaxDate) {
      effectiveMaxDate = windowEnd;
    }
  }

  const eligibleCoaches = preferredCoachId
    ? event.coaches.filter((c: { coachUserId: string }) => c.coachUserId === preferredCoachId)
    : event.coaches;

  if (eligibleCoaches.length === 0) return [];

  const coachIds: string[] = eligibleCoaches.map((c: any) => c.coachUserId);
  const isCoachAvailabilityMode = event.bookingMode !== EventBookingMode.FIXED_SLOTS;

  // Pre-fetch all event-coach weekly overrides in one query so the slot loop
  // does not fire a DB round-trip per coach per slot (N+1).
  // Skipped for FIXED_SLOTS events because isCoachAvailable uses ignoreWeeklySchedule:true there.
  const overrideMap = new Map<string, Array<{ dayOfWeek: number; startTime: string; endTime: string }>>();
  if (isCoachAvailabilityMode) {
    const allOverrides = await prisma.eventCoachWeeklyAvailability.findMany({
      where: { eventId, coachUserId: { in: coachIds } },
    });
    for (const o of allOverrides) {
      const list = overrideMap.get(o.coachUserId) ?? [];
      list.push({ dayOfWeek: o.dayOfWeek, startTime: o.startTime, endTime: o.endTime });
      overrideMap.set(o.coachUserId, list);
    }
  }

  // Batch pre-fetch stable per-coach data so the slot generation loop runs
  // entirely in-memory without N+1 DB queries.
  const timezoneMap = new Map<string, string>();
  const weeklyMap = new Map<string, UserWeeklyAvailability[]>();
  const exceptionsMap = new Map<string, UserAvailabilityException[]>();
  const rawConflictsMap = new Map<string, BookingWithEventBuffer[]>();

  if (isCoachAvailabilityMode) {
    // Extend the fetch window beyond effectiveMaxDate to cover cross-midnight slots:
    // a slot starting just before effectiveMaxDate can end durationSeconds + buffer later,
    // and may need exceptions or conflict bookings from the next calendar day.
    const batchFetchEnd = new Date(
      effectiveMaxDate.getTime() +
        event.durationSeconds * 1000 +
        (event.bufferAfterMinutes ?? 0) * 60_000,
    );

    const [users, weeklyRows, exceptionRows] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: coachIds } },
        select: { id: true, timezone: true },
      }),
      prisma.userWeeklyAvailability.findMany({ where: { userId: { in: coachIds } } }),
      prisma.userAvailabilityException.findMany({
        where: { userId: { in: coachIds }, date: { gte: startDate, lte: batchFetchEnd } },
      }),
    ]);

    for (const u of users) timezoneMap.set(u.id, u.timezone);
    for (const r of weeklyRows) {
      const list = weeklyMap.get(r.userId) ?? [];
      list.push(r);
      weeklyMap.set(r.userId, list);
    }
    for (const r of exceptionRows) {
      const list = exceptionsMap.get(r.userId) ?? [];
      list.push(r);
      exceptionsMap.set(r.userId, list);
    }

    // Fetch all bookings that could conflict with any slot in the date range.
    // The 120-min lookback mirrors getCoachConflicts' lookbackStartTime.
    // Upper bound uses batchFetchEnd so cross-midnight slots at end of range
    // can detect bookings that start on the next calendar day.
    const lookbackStart = new Date(startDate.getTime() - 120 * 60 * 1000);
    const conflictBookings = await prisma.booking.findMany({
      where: {
        OR: [{ coachUserId: { in: coachIds } }, { coCoachUserIds: { hasSome: coachIds } }],
        status: { in: ["CONFIRMED", "PENDING"] },
        startTime: { lt: batchFetchEnd },
        endTime: { gt: lookbackStart },
      },
      include: { event: true },
    }) as BookingWithEventBuffer[];

    for (const b of conflictBookings) {
      if (b.coachUserId && coachIds.includes(b.coachUserId)) {
        const list = rawConflictsMap.get(b.coachUserId) ?? [];
        list.push(b);
        rawConflictsMap.set(b.coachUserId, list);
      }
      for (const ccId of (b as any).coCoachUserIds ?? []) {
        if (coachIds.includes(ccId)) {
          const list = rawConflictsMap.get(ccId) ?? [];
          list.push(b);
          rawConflictsMap.set(ccId, list);
        }
      }
    }
  }

  const slots: AvailableSlot[] = [];

  const getSlotAvailability = async (
    slotStart: Date,
    slotEnd: Date,
    scheduleSlot?: { id: string; capacity: number | null },
  ): Promise<AvailableSlot | null> => {
    // Buffers and notice checks
    const BUFFER_MS = 2 * 60 * 1000;
    if (slotStart.getTime() <= Date.now() + BUFFER_MS || slotStart >= finalEnd) {
      return null;
    }

    try {
      assertBookingNoticeSatisfied(event.minimumNoticeMinutes, slotStart);
    } catch {
      return null;
    }

    // Capacity Logic — only enforced for FIXED_SLOTS (pre-created slots where multiple
    // students share a seat cap). For COACH_AVAILABILITY events each booking gets its own
    // coach, so counting cross-coach bookings at the same time would incorrectly hide slots
    // for free coaches. Coach conflict detection below is the real guard in that mode.
    let remainingSeats: number | null = null;
    let maxSeats: number | null = null;
    if (scheduleSlot) {
      const { maxParticipants } = getEffectiveParticipantPolicy(event, scheduleSlot);
      maxSeats = maxParticipants;
      const currentBookings = await prisma.booking.count({
        where: { scheduleSlotId: scheduleSlot.id, status: { not: "CANCELLED" } },
      });
      if (maxParticipants !== null && currentBookings >= maxParticipants) {
        return null;
      }
      remainingSeats = maxParticipants !== null ? maxParticipants - currentBookings : null;
    }

    const allowSharedSessionOverlap = event.bookingMode === EventBookingMode.FIXED_SLOTS;

    // Pre-compute effective slot end (buffer included) for in-memory conflict filtering.
    const effectiveSlotEnd = event.bufferAfterMinutes
      ? new Date(slotEnd.getTime() + event.bufferAfterMinutes * 60_000)
      : slotEnd;

    const buildPrefetch = (coachId: string) =>
      isCoachAvailabilityMode
        ? {
            timezone: timezoneMap.get(coachId),
            calendarData: {
              weekly: weeklyMap.get(coachId) ?? [],
              exceptions: exceptionsMap.get(coachId) ?? [],
            },
            prefetchedConflicts: filterConflictsForSlot(
              rawConflictsMap.get(coachId) ?? [],
              slotStart,
              effectiveSlotEnd,
              {
                eventId: allowSharedSessionOverlap ? eventId : undefined,
                scheduleSlotId: allowSharedSessionOverlap ? (scheduleSlot?.id ?? null) : undefined,
              },
            ),
          }
        : {};

    let isAvailable = false;

    // Assignment specific availability check
    if (scheduleSlot && (scheduleSlot as any).assignedCoachId) {
      // If a specific coach is assigned to this slot, only check their availability
      const assignedId = (scheduleSlot as any).assignedCoachId as string;
      if (
        await isCoachAvailable(assignedId, slotStart, slotEnd, {
          ignoreWeeklySchedule: event.bookingMode === EventBookingMode.FIXED_SLOTS,
          weeklyOverride: overrideMap.get(assignedId) ?? [],
          eventId: allowSharedSessionOverlap ? eventId : undefined,
          scheduleSlotId: allowSharedSessionOverlap ? (scheduleSlot?.id ?? null) : undefined,
          bufferAfterMinutes: event.bufferAfterMinutes,
          tx: (event as any).tx,
          ...buildPrefetch(assignedId),
        })
      ) {
        isAvailable = true;
      }
    } else if (event.assignmentStrategy === "DIRECT" && !preferredCoachId) {
      const primaryCoach = eligibleCoaches[0];
      if (
        primaryCoach &&
        (await isCoachAvailable(primaryCoach.coachUserId, slotStart, slotEnd, {
          ignoreWeeklySchedule: event.bookingMode === EventBookingMode.FIXED_SLOTS,
          weeklyOverride: overrideMap.get(primaryCoach.coachUserId) ?? [],
          eventId: allowSharedSessionOverlap ? eventId : undefined,
          scheduleSlotId: allowSharedSessionOverlap ? (scheduleSlot?.id ?? null) : undefined,
          bufferAfterMinutes: event.bufferAfterMinutes,
          ...buildPrefetch(primaryCoach.coachUserId),
        }))
      ) {
        isAvailable = true;
      }
    } else {
      for (const coach of eligibleCoaches) {
        if (
          await isCoachAvailable(coach.coachUserId, slotStart, slotEnd, {
            ignoreWeeklySchedule: event.bookingMode === EventBookingMode.FIXED_SLOTS,
            weeklyOverride: overrideMap.get(coach.coachUserId) ?? [],
            eventId: allowSharedSessionOverlap ? eventId : undefined,
            scheduleSlotId: allowSharedSessionOverlap ? (scheduleSlot?.id ?? null) : undefined,
            bufferAfterMinutes: event.bufferAfterMinutes,
            ...buildPrefetch(coach.coachUserId),
          })
        ) {
          isAvailable = true;
          break;
        }
      }
    }

    if (!isAvailable) return null;

    const assignedCoach = (scheduleSlot as any)?.assignedCoach ?? null;

    return {
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      scheduleSlotId: scheduleSlot?.id,
      remainingSeats,
      maxSeats,
      assignedCoach,
    };
  };

  const finalEnd = effectiveMaxDate;

  // Mode based resolution
  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    let allowedSlotIds: Set<string> | null = null;

    const recurrenceGroupIds = Array.from(
      new Set(
        event.scheduleSlots
          .map((s: any) => s.recurrenceGroupId)
          .filter((id: any): id is string => id != null),
      ),
    ) as string[];

    if (recurrenceGroupIds.length > 0) {
      const groups = await prisma.recurrenceGroup.findMany({
        where: { id: { in: recurrenceGroupIds } },
        select: { id: true, recurrenceVisibilityLimit: true },
      });

      const groupLimitMap = new Map<string, number>();
      for (const g of groups) {
        if (g.recurrenceVisibilityLimit != null) {
          groupLimitMap.set(g.id, g.recurrenceVisibilityLimit);
        }
      }

      if (groupLimitMap.size > 0) {
        allowedSlotIds = new Set<string>();
        const now = new Date();

        for (const [groupId, limit] of groupLimitMap) {
          const upcomingSlots = await prisma.eventScheduleSlot.findMany({
            where: {
              recurrenceGroupId: groupId,
              startTime: { gte: now },
              isCancelled: false,
              isActive: true,
            },
            orderBy: { startTime: "asc" },
            take: limit,
            select: { id: true },
          });

          for (const s of upcomingSlots) {
            allowedSlotIds.add(s.id);
          }
        }
      }
    }

    for (const scheduleSlot of event.scheduleSlots) {
      // Also filter fixed slots by window
      if (scheduleSlot.startTime >= finalEnd) continue;

      if (
        scheduleSlot.recurrenceGroupId &&
        allowedSlotIds &&
        !allowedSlotIds.has(scheduleSlot.id)
      ) {
        continue;
      }

      const availableSlot = await getSlotAvailability(
        scheduleSlot.startTime,
        scheduleSlot.endTime,
        scheduleSlot,
      );
      if (availableSlot) {
        slots.push(availableSlot);
      }
    }
    return slots;
  }

  // Window based resolution
  const durationMs = event.durationSeconds * 1000;
  const intervalMs = 15 * 60 * 1000;
  let currentStart = new Date(startDate);
  currentStart.setUTCHours(0, 0, 0, 0);

  while (currentStart < finalEnd) {
    for (let ms = 0; ms < 24 * 60 * 60 * 1000; ms += intervalMs) {
      const slotStart = new Date(currentStart.getTime() + ms);
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      if (slotStart < startDate) continue;
      if (slotStart >= finalEnd) break;

      const availableSlot = await getSlotAvailability(slotStart, slotEnd);
      if (availableSlot) {
        slots.push(availableSlot);
      }
    }
    currentStart.setUTCDate(currentStart.getUTCDate() + 1);
  }

  return slots;
};

export {
  getWeeklyAvailability,
  setWeeklyAvailability,
  getAvailabilityExceptions,
  addAvailabilityException,
  removeAvailabilityException,
  getEffectiveAvailability,
  isCoachAvailable,
  evaluateCoachAvailability,
  endOfBookingWindowInTimezone,
  getAvailableSlots,
};

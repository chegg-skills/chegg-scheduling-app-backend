import {
  Prisma,
  PrismaClient,
  UserAvailabilityException,
  UserRole,
  UserWeeklyAvailability,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { toDateOnlyString } from "../../shared/utils/date";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  AddAvailabilityExceptionSchema,
  AvailabilitySchemas,
  SetWeeklyAvailabilitySchema,
} from "./availability.schema";

/** Prisma client or transaction client — availability helpers accept either. */
export type AvailabilityClient = Prisma.TransactionClient | PrismaClient;

/**
 * Local-timezone representation of a point in time, produced by
 * `toLocalAvailabilityInfo`. All availability comparisons use these
 * localised values rather than raw UTC to correctly handle coaches in
 * half-hour-offset timezones (IST, Nepal) and cross-midnight sessions.
 */
export type LocalAvailabilityInfo = {
  /** Local time as `"HH:mm"` in 24-hour format (hourCycle h23). */
  hhmm: string;
  /** Local day of week (0 = Sunday … 6 = Saturday). */
  dayOfWeek: number;
  /** Local calendar date as `"YYYY-MM-DD"`, used to detect cross-midnight sessions. */
  dateString: string;
};

/**
 * Enforces availability management permissions, throwing 403 on any violation.
 *
 * Rules:
 * - SUPER_ADMIN and TEAM_ADMIN may always read and write any user's availability.
 * - A COACH may read their own availability but **cannot write their own weekly
 *   schedule** — only admins can set recurring weekly windows for coaches.
 * - No user may manage another user's availability unless they are an admin.
 *
 * @param targetUserId - The user whose availability is being accessed.
 * @param caller       - The authenticated requester.
 * @param mode         - `"weekly"` (recurring windows) or `"exceptions"` (one-off overrides).
 * @param action       - `"read"` or `"write"` (default `"write"`).
 * @throws {ErrorHandler} 403 — caller lacks permission.
 */
export const assertCanManageAvailability = (
  targetUserId: string,
  caller: CallerContext,
  mode: "weekly" | "exceptions",
  action: "read" | "write" = "write",
): void => {
  if (caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN) {
    return;
  }

  if (caller.id !== targetUserId) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "You do not have permission to manage this user's availability.",
    );
  }

  if (mode === "weekly" && action === "write" && caller.role === UserRole.COACH) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "Coaches are not allowed to manage their own recurring weekly availability. Please contact a team administrator for schedule changes.",
    );
  }
};

export const validateWeeklySlots = (
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
): void => {
  SetWeeklyAvailabilitySchema.body.parse(slots);
};

export const parseAvailabilityExceptionDate = (value: Date | string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid date provided.");
  }
  return date;
};

export const validateAvailabilityExceptionInput = (payload: {
  isUnavailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
  date?: string;
}): void => {
  // Use improved partial schema to avoid refinement issues
  AvailabilitySchemas.exception.partial.parse(payload);
};

/**
 * Builds a Prisma `NOT` filter that excludes bookings belonging to the current
 * session when checking for coach conflicts. This prevents a slot's own
 * bookings from appearing as conflicts against the coach assigned to that slot.
 *
 * - For `FIXED_SLOTS` bookings: excludes by `scheduleSlotId` (all bookings in
 *   the same group slot are part of the same session).
 * - For `COACH_AVAILABILITY` bookings: excludes by `eventId + startTime + endTime`.
 * - Returns `undefined` when no `eventId` is provided (no exclusion applied).
 *
 * @param startTime - UTC start of the session being checked.
 * @param endTime   - UTC end of the session being checked.
 * @param options   - Event and slot identifiers for the exclusion scope.
 */
export const buildSameSessionExclusion = (
  startTime: Date,
  endTime: Date,
  options: {
    eventId?: string;
    scheduleSlotId?: string | null;
  },
): Prisma.BookingWhereInput | undefined => {
  if (!options.eventId) {
    return undefined;
  }

  return {
    NOT: options.scheduleSlotId
      ? { scheduleSlotId: options.scheduleSlotId }
      : {
          eventId: options.eventId,
          startTime,
          endTime,
        },
  };
};

/**
 * Converts an `"HH:mm"` string to a total-minutes integer for numeric
 * comparison. Must be used instead of lexicographic string comparison because
 * `"09:30" >= "09:00"` would silently misclassify times for coaches in
 * half-hour-offset timezones (e.g. IST `"05:30"`, Nepal `"05:45"`).
 *
 * @param hhmm - 24-hour time string in `"HH:mm"` format.
 */
export const hhmmToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Converts a UTC Date to its local representation in the given IANA timezone,
 * returning the components needed for availability window comparisons.
 *
 * Uses `Intl.DateTimeFormat` with `hourCycle: "h23"` so that midnight is
 * represented as `"00:00"` rather than `"24:00"`, which matters for
 * cross-midnight session detection (`startLocal.dateString !== endLocal.dateString`).
 *
 * @param date     - The UTC instant to localise.
 * @param timeZone - A valid IANA timezone string (e.g. `"Asia/Kolkata"`).
 * @throws {Error} If `timeZone` is not a valid IANA timezone string. Callers
 *   (e.g. `isCoachAvailable`) should catch this and treat the coach as unavailable.
 */
export const toLocalAvailabilityInfo = (date: Date, timeZone: string): LocalAvailabilityInfo => {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    }).formatToParts(date);
  } catch {
    throw new Error(`Invalid IANA timezone string: "${timeZone}"`);
  }

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value;

  const year = getPart("year")!;
  const month = getPart("month")!;
  const day = getPart("day")!;
  const hour = getPart("hour")!;
  const minute = getPart("minute")!;
  const weekdayName = getPart("weekday")!;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    hhmm: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    dayOfWeek: weekdayMap[weekdayName],
    dateString: `${year}-${month}-${day}`,
  };
};

export const findAvailabilityException = (
  exceptions: UserAvailabilityException[],
  dateString: string,
): UserAvailabilityException | undefined => {
  return exceptions.find((exception) => {
    return toDateOnlyString(exception.date) === dateString;
  });
};

/**
 * Determines whether a session falls within or conflicts with a one-off
 * availability exception, returning a three-state result:
 *
 * - `false`  — the exception explicitly blocks this time (unavailable).
 * - `true`   — the exception explicitly grants availability for this time.
 * - `null`   — no exception applies; fall back to the weekly availability windows.
 *
 * Exception semantics:
 * - All-day block (`isUnavailable: true`, no time range) → always `false`.
 * - Partial block (`isUnavailable: true`, with time range) → `false` if the
 *   session overlaps the blocked window, otherwise `null` (defer to weekly).
 * - Availability grant (`isUnavailable: false`, with time range) → `true` if
 *   the session is fully contained within the granted window, otherwise `null`.
 *
 * @param dayException - The exception record for the session's local date, if any.
 * @param startLocal   - Localised start of the session.
 * @param endLocal     - Localised end of the session.
 */
export const resolveAvailabilityFromException = (
  dayException: UserAvailabilityException | undefined,
  startLocal: LocalAvailabilityInfo,
  endLocal: LocalAvailabilityInfo,
): boolean | null => {
  if (!dayException) {
    return null;
  }

  if (dayException.isUnavailable && !dayException.startTime) {
    return false;
  }

  if (dayException.isUnavailable && dayException.startTime && dayException.endTime) {
    const overlapsException =
      hhmmToMinutes(startLocal.hhmm) < hhmmToMinutes(dayException.endTime) &&
      hhmmToMinutes(endLocal.hhmm) > hhmmToMinutes(dayException.startTime);

    return overlapsException ? false : null;
  }

  if (!dayException.isUnavailable && dayException.startTime && dayException.endTime) {
    return (
      hhmmToMinutes(startLocal.hhmm) >= hhmmToMinutes(dayException.startTime) &&
      hhmmToMinutes(endLocal.hhmm) <= hhmmToMinutes(dayException.endTime)
    );
  }

  return null;
};

/**
 * Returns `true` if the session is fully contained within at least one of the
 * coach's weekly availability windows for the session's local day of week.
 *
 * A session spanning multiple windows (e.g. 08:50–09:10 across two adjacent
 * slots) will return `false` — each window is checked independently and the
 * session must fit entirely within a single window. Callers that need to
 * support multi-window spans should split the session before calling.
 *
 * @param weekly     - All weekly availability records for the coach.
 * @param startLocal - Localised start of the session.
 * @param endLocal   - Localised end of the session.
 */
export const isWithinWeeklyAvailability = (
  weekly: UserWeeklyAvailability[],
  startLocal: LocalAvailabilityInfo,
  endLocal: LocalAvailabilityInfo,
): boolean => {
  const daySlots = weekly.filter((slot) => slot.dayOfWeek === startLocal.dayOfWeek);

  const startMins = hhmmToMinutes(startLocal.hhmm);
  const endMins = hhmmToMinutes(endLocal.hhmm);
  return daySlots.some(
    (slot) => startMins >= hhmmToMinutes(slot.startTime) && endMins <= hhmmToMinutes(slot.endTime),
  );
};

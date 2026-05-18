import { EventBookingMode, Prisma, UserAvailabilityException, UserRole, UserWeeklyAvailability } from "@prisma/client";
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
  assertBookingAvailabilityAllowed,
  getEffectiveParticipantPolicy,
} from "../events/eventScheduling.service";
import {
  getWeeklyAvailability,
  setWeeklyAvailability,
  getAvailabilityExceptions,
  addAvailabilityException,
  removeAvailabilityException,
  getEffectiveAvailabilityData as getEffectiveAvailability,
} from "./availabilityCalendar.service";
import { getCoachConflicts } from "./availabilityConflict.service";

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
  const day2ExceptionResult = resolveAvailabilityFromException(
    day2Exception,
    atMidnight,
    endLocal,
  );
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
  weeklyAvailability: true,
});

const isCoachAvailable = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  options: {
    ignoreWeeklySchedule?: boolean;
    eventId?: string;
    scheduleSlotId?: string | null;
    tx?: AvailabilityClient;
    bufferAfterMinutes?: number;
  } = {},
): Promise<boolean> => {
  const client: AvailabilityClient = options.tx || prisma;

  // 1. Resolve Coach and Calendar Data
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  if (!user) return false;

  const effectiveEndTime = options.bufferAfterMinutes
    ? new Date(endTime.getTime() + options.bufferAfterMinutes * 60 * 1000)
    : endTime;

  const [calendar, conflicts] = await Promise.all([
    getEffectiveAvailability(userId, startTime, effectiveEndTime, {
      id: userId,
      role: UserRole.COACH,
    }),
    getCoachConflicts(userId, startTime, effectiveEndTime, options),
  ]);

  // 2. Conflict Check (Bookings)
  if (conflicts.length > 0) {
    return false;
  }

  // 3. Exception Decision (Overrides)
  let startLocal: LocalAvailabilityInfo;
  let endLocal: LocalAvailabilityInfo;
  try {
    startLocal = toLocalAvailabilityInfo(startTime, user.timezone);
    endLocal = toLocalAvailabilityInfo(effectiveEndTime, user.timezone);
  } catch {
    console.warn(
      `[isCoachAvailable] Invalid timezone "${user.timezone}" for user ${userId}. Treating as unavailable.`,
    );
    return false;
  }

  if (startLocal.dateString !== endLocal.dateString) {
    if (options.ignoreWeeklySchedule) return true;
    return isCoachAvailableAcrossMidnight(startTime, effectiveEndTime, calendar, user.timezone);
  }

  const dayException = findAvailabilityException(calendar.exceptions, startLocal.dateString);
  const exceptionDecision = resolveAvailabilityFromException(dayException, startLocal, endLocal);

  if (exceptionDecision !== null) {
    return exceptionDecision;
  }

  // 4. Weekly Schedule Fallback
  if (options.ignoreWeeklySchedule) {
    return true;
  }

  return isWithinWeeklyAvailability(calendar.weekly, startLocal, endLocal);
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
      // Fixed slots were explicitly created by an admin on a specific date — skip weekday/time-range
      // checks. Only apply these checks for auto-generated flexible slots (no pre-existing scheduleSlot).
      if (!scheduleSlot) {
        assertBookingAvailabilityAllowed(
          event.allowedWeekdays,
          event.weeklyAvailability,
          slotStart,
          slotEnd,
        );
      }
      assertBookingNoticeSatisfied(event.minimumNoticeMinutes, slotStart);
    } catch {
      return null;
    }

    // Capacity Logic
    const { maxParticipants } = getEffectiveParticipantPolicy(event, scheduleSlot ?? null);
    const currentBookings = await prisma.booking.count({
      where: (scheduleSlot
        ? {
            scheduleSlotId: scheduleSlot.id,
            status: { not: "CANCELLED" },
          }
        : {
            eventId,
            startTime: slotStart,
            endTime: slotEnd,
            status: { not: "CANCELLED" },
          }) as any,
    });

    if (maxParticipants !== null && currentBookings >= maxParticipants) {
      return null;
    }

    const allowSharedSessionOverlap = event.bookingMode === EventBookingMode.FIXED_SLOTS;

    let isAvailable = false;

    // Assignment specific availability check
    if (scheduleSlot && (scheduleSlot as any).assignedCoachId) {
      // If a specific coach is assigned to this slot, only check their availability
      if (
        await isCoachAvailable((scheduleSlot as any).assignedCoachId, slotStart, slotEnd, {
          ignoreWeeklySchedule: event.bookingMode === EventBookingMode.FIXED_SLOTS,
          eventId: allowSharedSessionOverlap ? eventId : undefined,
          scheduleSlotId: allowSharedSessionOverlap ? (scheduleSlot?.id ?? null) : undefined,
          bufferAfterMinutes: event.bufferAfterMinutes,
          tx: (event as any).tx, // Pass tx if available in context (though getAvailableSlots doesn't usually have it)
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
          eventId: allowSharedSessionOverlap ? eventId : undefined,
          scheduleSlotId: allowSharedSessionOverlap ? (scheduleSlot?.id ?? null) : undefined,
          bufferAfterMinutes: event.bufferAfterMinutes,
        }))
      ) {
        isAvailable = true;
      }
    } else {
      for (const coach of eligibleCoaches) {
        if (
          await isCoachAvailable(coach.coachUserId, slotStart, slotEnd, {
            ignoreWeeklySchedule: event.bookingMode === EventBookingMode.FIXED_SLOTS,
            eventId: allowSharedSessionOverlap ? eventId : undefined,
            scheduleSlotId: allowSharedSessionOverlap ? (scheduleSlot?.id ?? null) : undefined,
            bufferAfterMinutes: event.bufferAfterMinutes,
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
      remainingSeats: maxParticipants !== null ? maxParticipants - currentBookings : null,
      maxSeats: maxParticipants,
      assignedCoach,
    };
  };

  const finalEnd = effectiveMaxDate;

  // Mode based resolution
  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    for (const scheduleSlot of event.scheduleSlots) {
      // Also filter fixed slots by window
      if (scheduleSlot.startTime >= finalEnd) continue;

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
  getAvailableSlots,
};

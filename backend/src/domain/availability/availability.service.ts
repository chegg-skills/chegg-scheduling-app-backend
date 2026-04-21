import { EventBookingMode, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  findAvailabilityException,
  isWithinWeeklyAvailability,
  toLocalAvailabilityInfo,
  resolveAvailabilityFromException,
  type AvailabilityClient,
} from "./availability.shared";
import { type SafeEvent } from "../events/event.shared";
import {
  assertBookingNoticeSatisfied,
  assertBookingWeekdayAllowed,
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
  const startLocal = toLocalAvailabilityInfo(startTime, user.timezone);
  const endLocal = toLocalAvailabilityInfo(effectiveEndTime, user.timezone);

  if (startLocal.dateString !== endLocal.dateString) {
    return false; // Sessions across date boundaries are currently unsupported
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
  // Use UTC arithmetic throughout so the boundary is consistent regardless of
  // the server's local timezone. The frontend mirrors this with setUTCDate /
  // setUTCHours so both sides agree on the last bookable moment.
  let effectiveMaxDate = endDate;
  const event = eventResult as any;
  if (event.maxBookingWindowDays != null) {
    const windowEnd = new Date();
    windowEnd.setUTCDate(windowEnd.getUTCDate() + event.maxBookingWindowDays);
    windowEnd.setUTCHours(23, 59, 59, 999);

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
      assertBookingWeekdayAllowed(event.allowedWeekdays, slotStart);
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

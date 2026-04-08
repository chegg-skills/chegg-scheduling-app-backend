import {
  EventBookingMode,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../shared/db/prisma';
import type { CallerContext } from '../../shared/utils/userUtils';
import {
  findAvailabilityException,
  isWithinWeeklyAvailability,
  toLocalAvailabilityInfo,
  resolveAvailabilityFromException,
  type AvailabilityClient,
} from './availability.shared';
import {
  assertBookingNoticeSatisfied,
  assertBookingWeekdayAllowed,
  getEffectiveParticipantPolicy,
} from '../events/eventScheduling.service';
import {
  getWeeklyAvailability,
  setWeeklyAvailability,
  getAvailabilityExceptions,
  addAvailabilityException,
  removeAvailabilityException,
  getEffectiveAvailabilityData as getEffectiveAvailability,
} from './availabilityCalendar.service';
import { getHostConflicts } from './availabilityConflict.service';

/**
 * Facade service for availability lookups.
 * Orchestrates calendar data (weekly/exceptions) and booking conflicts.
 */

const availabilityEventInclude = Prisma.validator<Prisma.EventInclude>()({
  interactionType: {
    select: {
      minParticipants: true,
      maxParticipants: true,
    },
  },
  scheduleSlots: {
    where: {
      isActive: true,
    },
    orderBy: { startTime: 'asc' },
  },
  hosts: {
    where: { isActive: true },
    orderBy: { hostOrder: 'asc' },
  },
});

const isHostAvailable = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  options: {
    ignoreWeeklySchedule?: boolean;
    eventId?: string;
    scheduleSlotId?: string | null;
    tx?: AvailabilityClient;
  } = {},
): Promise<boolean> => {
  const client: AvailabilityClient = options.tx || prisma;

  // 1. Resolve Host and Calendar Data
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  if (!user) return false;

  const [calendar, conflicts] = await Promise.all([
    getEffectiveAvailability(userId, startTime, endTime, { id: userId, role: 'COACH' } as any),
    getHostConflicts(userId, startTime, endTime, options),
  ]);

  // 2. Conflict Check (Bookings)
  if (conflicts.length > 0) {
    return false;
  }

  // 3. Exception Decision (Overrides)
  const startLocal = toLocalAvailabilityInfo(startTime, user.timezone);
  const endLocal = toLocalAvailabilityInfo(endTime, user.timezone);

  if (startLocal.dateString !== endLocal.dateString) {
    return false; // Sessions across date boundaries are currently unsupported
  }

  const dayException = findAvailabilityException(calendar.exceptions, startLocal.dateString);
  const exceptionDecision = resolveAvailabilityFromException(
    dayException,
    startLocal,
    endLocal,
  );

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
};

const getAvailableSlots = async (
  eventId: string,
  startDate: Date,
  endDate: Date,
  preferredHostId?: string,
): Promise<AvailableSlot[]> => {
  const event = await prisma.event.findUnique({
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
        orderBy: { startTime: 'asc' },
      },
    },
  });

  if (!event || event.hosts.length === 0) {
    return [];
  }

  const eligibleHosts = preferredHostId
    ? event.hosts.filter((host) => host.hostUserId === preferredHostId)
    : event.hosts;

  if (eligibleHosts.length === 0) return [];

  const slots: AvailableSlot[] = [];

  const getSlotAvailability = async (
    slotStart: Date,
    slotEnd: Date,
    scheduleSlot?: { id: string; capacity: number | null },
  ): Promise<AvailableSlot | null> => {
    // Buffers and notice checks
    const BUFFER_MS = 2 * 60 * 1000;
    if (slotStart.getTime() <= Date.now() + BUFFER_MS || slotStart >= endDate) {
      return null;
    }

    try {
      assertBookingWeekdayAllowed(event.allowedWeekdays, slotStart);
      assertBookingNoticeSatisfied(event.minimumNoticeMinutes, slotStart);
    } catch {
      return null;
    }

    // Capacity Logic
    const { maxParticipants } = getEffectiveParticipantPolicy(
      event,
      scheduleSlot ?? event.interactionType,
    );
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

    const allowSharedSessionOverlap =
      event.bookingMode === EventBookingMode.FIXED_SLOTS;

    let isAvailable = false;

    // Assignment specific availability check
    if (event.assignmentStrategy === "DIRECT" && !preferredHostId) {
      const primaryHost = eligibleHosts[0];
      if (primaryHost && await isHostAvailable(primaryHost.hostUserId, slotStart, slotEnd, {
        ignoreWeeklySchedule: event.bookingMode === EventBookingMode.FIXED_SLOTS,
        eventId: allowSharedSessionOverlap ? eventId : undefined,
        scheduleSlotId: allowSharedSessionOverlap ? scheduleSlot?.id ?? null : undefined,
      })) {
        isAvailable = true;
      }
    } else {
      for (const host of eligibleHosts) {
        if (
          await isHostAvailable(host.hostUserId, slotStart, slotEnd, {
            ignoreWeeklySchedule: event.bookingMode === EventBookingMode.FIXED_SLOTS,
            eventId: allowSharedSessionOverlap ? eventId : undefined,
            scheduleSlotId: allowSharedSessionOverlap ? scheduleSlot?.id ?? null : undefined,
          })
        ) {
          isAvailable = true;
          break;
        }
      }
    }

    if (!isAvailable) return null;

    return {
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      scheduleSlotId: scheduleSlot?.id,
      remainingSeats: maxParticipants !== null ? maxParticipants - currentBookings : null,
      maxSeats: maxParticipants,
    };
  };

  // Mode based resolution
  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    for (const scheduleSlot of event.scheduleSlots) {
      const availableSlot = await getSlotAvailability(scheduleSlot.startTime, scheduleSlot.endTime, scheduleSlot);
      if (availableSlot) {
        slots.push(availableSlot);
      }
    }
    return slots;
  }

  // Window based resolution
  const durationMs = event.durationSeconds * 1000;
  const intervalMs = 15 * 60 * 1000;
  const finalEnd = new Date(endDate);
  finalEnd.setUTCHours(23, 59, 59, 999);
  let currentStart = new Date(startDate);
  currentStart.setUTCHours(0, 0, 0, 0);

  while (currentStart < finalEnd) {
    for (let ms = 0; ms < 24 * 60 * 60 * 1000; ms += intervalMs) {
      const slotStart = new Date(currentStart.getTime() + ms);
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      if (slotStart >= finalEnd) break;

      const availableSlot = await getSlotAvailability(slotStart, slotEnd);
      if (availableSlot) slots.push(availableSlot);
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
  isHostAvailable,
  getAvailableSlots,
};

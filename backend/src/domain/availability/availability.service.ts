import {
  EventBookingMode,
  Prisma,
  UserAvailabilityException,
  UserWeeklyAvailability,
} from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../../shared/db/prisma';
import { ErrorHandler } from '../../shared/error/errorhandler';
import type { CallerContext } from '../../shared/utils/userUtils';
import {
  assertCanManageAvailability,
  buildSameSessionExclusion,
  findAvailabilityException,
  isWithinWeeklyAvailability,
  parseAvailabilityExceptionDate,
  resolveAvailabilityFromException,
  toLocalAvailabilityInfo,
  validateAvailabilityExceptionInput,
  validateWeeklySlots,
  type AvailabilityClient,
} from './availability.shared';
import {
  assertBookingNoticeSatisfied,
  assertBookingWeekdayAllowed,
  getEffectiveParticipantPolicy,
} from '../events/eventScheduling.service';

type SetWeeklyAvailabilityInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}[];

type AddAvailabilityExceptionInput = {
  date: Date | string;
  isUnavailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

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

type AvailabilityEvent = Prisma.EventGetPayload<{
  include: typeof availabilityEventInclude;
}>;

const getWeeklyAvailability = async (userId: string, caller: CallerContext): Promise<UserWeeklyAvailability[]> => {
  await assertCanManageAvailability(userId, caller);
  return prisma.userWeeklyAvailability.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
};

const setWeeklyAvailability = async (
  userId: string,
  slots: SetWeeklyAvailabilityInput,
  caller: CallerContext,
): Promise<UserWeeklyAvailability[]> => {
  await assertCanManageAvailability(userId, caller);
  validateWeeklySlots(slots);

  await prisma.$transaction([
    prisma.userWeeklyAvailability.deleteMany({ where: { userId } }),
    prisma.userWeeklyAvailability.createMany({
      data: slots.map(slot => ({ ...slot, userId })),
    }),
  ]);

  return getWeeklyAvailability(userId, caller);
};

const getAvailabilityExceptions = async (userId: string, caller: CallerContext): Promise<UserAvailabilityException[]> => {
  await assertCanManageAvailability(userId, caller);
  return prisma.userAvailabilityException.findMany({
    where: { userId },
    orderBy: [{ date: 'asc' }],
  });
};

const addAvailabilityException = async (
  userId: string,
  payload: AddAvailabilityExceptionInput,
  caller: CallerContext,
): Promise<UserAvailabilityException> => {
  await assertCanManageAvailability(userId, caller);

  const date = parseAvailabilityExceptionDate(payload.date);
  validateAvailabilityExceptionInput(payload);

  return prisma.userAvailabilityException.create({
    data: {
      userId,
      date,
      isUnavailable: payload.isUnavailable,
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
    },
  });
};

const removeAvailabilityException = async (userId: string, exceptionId: string, caller: CallerContext): Promise<void> => {
  await assertCanManageAvailability(userId, caller);

  const exception = await prisma.userAvailabilityException.findUnique({
    where: { id: exceptionId },
  });

  if (!exception) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Availability exception not found.");
  }

  if (exception.userId !== userId) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Exception does not belong to the specified user.");
  }

  await prisma.userAvailabilityException.delete({
    where: { id: exceptionId },
  });
};

const getEffectiveAvailability = async (
  userId: string,
  from: Date,
  to: Date,
  caller: CallerContext,
) => {
  await assertCanManageAvailability(userId, caller);

  const [weekly, exceptions] = await Promise.all([
    prisma.userWeeklyAvailability.findMany({ where: { userId } }),
    prisma.userAvailabilityException.findMany({
      where: {
        userId,
        date: {
          gte: from,
          lte: to,
        },
      },
    }),
  ]);

  return { weekly, exceptions };
};

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
  const user = await client.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  if (!user) {
    return false;
  }

  const sameSessionExclusion = buildSameSessionExclusion(
    startTime,
    endTime,
    options,
  );

  const [weekly, exceptions, conflicts] = await Promise.all([
    client.userWeeklyAvailability.findMany({ where: { userId } }),
    client.userAvailabilityException.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startTime.getTime() - 24 * 60 * 60 * 1000),
          lte: new Date(endTime.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    }),
    client.booking.findFirst({
      where: {
        hostUserId: userId,
        status: { not: 'CANCELLED' },
        ...(sameSessionExclusion ? { NOT: sameSessionExclusion } : {}),
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    }),
  ]);

  if (conflicts) {
    return false;
  }

  const startLocal = toLocalAvailabilityInfo(startTime, user.timezone);
  const endLocal = toLocalAvailabilityInfo(endTime, user.timezone);

  if (startLocal.dateString !== endLocal.dateString) {
    return false;
  }

  const dayException = findAvailabilityException(exceptions, startLocal.dateString);
  const exceptionDecision = resolveAvailabilityFromException(
    dayException,
    startLocal,
    endLocal,
  );

  if (exceptionDecision !== null) {
    return exceptionDecision;
  }

  if (options.ignoreWeeklySchedule) {
    return true;
  }

  return isWithinWeeklyAvailability(weekly, startLocal, endLocal);
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
    // Don't show slots that start in the past or very soon (2 min buffer)
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

    if (!isAvailable) return null;

    return {
      startTime: slotStart.toISOString(),
      endTime: slotEnd.toISOString(),
      scheduleSlotId: scheduleSlot?.id,
      remainingSeats: maxParticipants !== null ? maxParticipants - currentBookings : null,
      maxSeats: maxParticipants,
    };
  };

  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    for (const scheduleSlot of event.scheduleSlots) {
      const availableSlot = await getSlotAvailability(scheduleSlot.startTime, scheduleSlot.endTime, scheduleSlot);
      if (availableSlot) {
        slots.push(availableSlot);
      }
    }

    return slots;
  }

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

      if (slotStart >= finalEnd) {
        break;
      }

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
  isHostAvailable,
  getAvailableSlots,
};

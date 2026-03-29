import { Prisma, UserRole, UserWeeklyAvailability, UserAvailabilityException } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { prisma } from '../../shared/db/prisma';
import { ErrorHandler } from '../../shared/error/errorhandler';
import type { CallerContext } from '../../shared/utils/userUtils';

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

const assertCanManageAvailability = (targetUserId: string, caller: CallerContext): void => {
  if (caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN) {
    return;
  }

  if (caller.id !== targetUserId) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "You do not have permission to manage this user's availability.");
  }
};

const validateTimeFormat = (time: string, fieldName: string): void => {
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!timeRegex.test(time)) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, `${fieldName} must be in HH:mm format.`);
  }
};

const validateWeeklySlots = (slots: SetWeeklyAvailabilityInput): void => {
  for (const slot of slots) {
    if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "dayOfWeek must be an integer between 0 and 6.");
    }
    validateTimeFormat(slot.startTime, "startTime");
    validateTimeFormat(slot.endTime, "endTime");

    if (slot.startTime >= slot.endTime) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "startTime must be before endTime.");
    }
  }
};

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

  const date = new Date(payload.date);
  if (isNaN(date.getTime())) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid date provided.");
  }

  if (!payload.isUnavailable) {
    if (!payload.startTime || !payload.endTime) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "startTime and endTime are required if user is not unavailable for the whole day.");
    }
    validateTimeFormat(payload.startTime, "startTime");
    validateTimeFormat(payload.endTime, "endTime");
    if (payload.startTime >= payload.endTime) {
      throw new ErrorHandler(StatusCodes.BAD_REQUEST, "startTime must be before endTime.");
    }
  }

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
): Promise<boolean> => {
  // 1. Fetch host timezone, schedule, exceptions, and existing bookings
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });

  if (!user) return false;

  const [weekly, exceptions, conflicts] = await Promise.all([
    prisma.userWeeklyAvailability.findMany({ where: { userId } }),
    prisma.userAvailabilityException.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startTime.getTime() - 24 * 60 * 60 * 1000), // Check yesterday just in case of TZ wrap
          lte: new Date(endTime.getTime() + 24 * 60 * 60 * 1000),  // Check tomorrow just in case of TZ wrap
        },
      },
    }),
    prisma.booking.findFirst({
      where: {
        hostUserId: userId,
        status: "CONFIRMED",
        OR: [
          {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        ],
      },
    }),
  ]);

  // If there's a conflict, host is not available
  if (conflicts) return false;

  // 2. Convert UTC times to Host Local Time for schedule matching
  const hostTz = user.timezone;

  const toLocalInfo = (date: Date) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: hostTz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short'
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;

    const year = getPart('year')!;
    const month = getPart('month')!;
    const day = getPart('day')!;
    const hour = getPart('hour')!;
    const minute = getPart('minute')!;
    const weekdayName = getPart('weekday')!;

    const weekdayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
    };

    return {
      hhmm: `${hour}:${minute}`,
      dayOfWeek: weekdayMap[weekdayName],
      dateString: `${year}-${month}-${day}`
    };
  };

  const startLocal = toLocalInfo(startTime);
  const endLocal = toLocalInfo(endTime);

  // If the booking spans across two local days, we reject for now (simplification)
  if (startLocal.dateString !== endLocal.dateString) {
    return false;
  }

  // 3. Check Exceptions
  const dayException = exceptions.find((e: UserAvailabilityException) => {
    const eDate = e.date.toISOString().split('T')[0];
    return eDate === startLocal.dateString;
  });

  if (dayException) {
    if (dayException.isUnavailable && !dayException.startTime) {
      return false; // Full day off
    }
    if (dayException.isUnavailable && dayException.startTime && dayException.endTime) {
      // Partial day off - check overlap
      if (startLocal.hhmm < dayException.endTime && endLocal.hhmm > dayException.startTime) {
        return false;
      }
    } else if (!dayException.isUnavailable && dayException.startTime && dayException.endTime) {
      // Custom availability - must fit within
      return startLocal.hhmm >= dayException.startTime && endLocal.hhmm <= dayException.endTime;
    }
  }

  // 4. Check Weekly Schedule (if no exception overrode it)
  const daySlots = weekly.filter((slot: UserWeeklyAvailability) => slot.dayOfWeek === startLocal.dayOfWeek);
  const isWithinWeekly = daySlots.some((slot: UserWeeklyAvailability) =>
    startLocal.hhmm >= slot.startTime && endLocal.hhmm <= slot.endTime
  );

  return isWithinWeekly;
};

const getAvailableSlots = async (
  eventId: string,
  startDate: Date,
  endDate: Date,
): Promise<string[]> => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      hosts: {
        where: { isActive: true },
      },
    },
  });

  if (!event || event.hosts.length === 0) return [];

  const slots: string[] = [];
  const durationMs = event.durationSeconds * 1000;
  const intervalMs = 15 * 60 * 1000; // Check every 15 minutes

  // Iterate through each day in the range
  let currentStart = new Date(startDate);
  currentStart.setUTCHours(0, 0, 0, 0);
  const finalEnd = new Date(endDate);
  finalEnd.setUTCHours(23, 59, 59, 999);

  while (currentStart < finalEnd) {
    // For each day, generate potential intervals
    // We'll check from 00:00 to 23:59 (relative to UTC, but hosts use their local time)
    // To be efficient, we only check intervals that could fit in a day
    for (let ms = 0; ms < 24 * 60 * 60 * 1000; ms += intervalMs) {
      const slotStart = new Date(currentStart.getTime() + ms);
      const slotEnd = new Date(slotStart.getTime() + durationMs);

      // Only check if slot is in the future
      if (slotStart <= new Date()) continue;
      if (slotStart >= finalEnd) break;

      // Check if ANY host is available for this specific slot
      // Optimization: We could parallelize this, but let's start simple
      for (const host of event.hosts) {
        if (await isHostAvailable(host.hostUserId, slotStart, slotEnd)) {
          slots.push(slotStart.toISOString());
          break; // One host available is enough for the slot to be shown
        }
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

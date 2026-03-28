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

export {
  getWeeklyAvailability,
  setWeeklyAvailability,
  getAvailabilityExceptions,
  addAvailabilityException,
  removeAvailabilityException,
  getEffectiveAvailability,
};

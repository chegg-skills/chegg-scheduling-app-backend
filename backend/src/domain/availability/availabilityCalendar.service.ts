import { StatusCodes } from 'http-status-codes';
import {
    Prisma,
    UserAvailabilityException,
    UserWeeklyAvailability,
} from '@prisma/client';
import { prisma } from '../../shared/db/prisma';
import type { CallerContext } from '../../shared/utils/userUtils';
import { ErrorHandler } from '../../shared/error/errorhandler';
import {
    assertCanManageAvailability,
    parseAvailabilityExceptionDate,
    validateAvailabilityExceptionInput,
    validateWeeklySlots,
} from './availability.shared';
import { queueAvailabilityExceptionNotification } from './availability.notification';

/**
 * Service responsible for managing the raw availability data (weekly and exceptions) for users.
 * De-couples data management from the complex conflict detection logic.
 */

export const getWeeklyAvailability = async (
    userId: string,
    caller: CallerContext,
): Promise<UserWeeklyAvailability[]> => {
    await assertCanManageAvailability(userId, caller, 'weekly', 'read');
    return prisma.userWeeklyAvailability.findMany({
        where: { userId },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
};

export const setWeeklyAvailability = async (
    userId: string,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[],
    caller: CallerContext,
): Promise<UserWeeklyAvailability[]> => {
    await assertCanManageAvailability(userId, caller, 'weekly', 'write');
    validateWeeklySlots(slots);

    await prisma.$transaction([
        prisma.userWeeklyAvailability.deleteMany({ where: { userId } }),
        prisma.userWeeklyAvailability.createMany({
            data: slots.map((slot) => ({ ...slot, userId })),
        }),
    ]);

    return getWeeklyAvailability(userId, caller);
};

export const getAvailabilityExceptions = async (
    userId: string,
    caller: CallerContext,
): Promise<UserAvailabilityException[]> => {
    await assertCanManageAvailability(userId, caller, 'exceptions', 'read');
    return prisma.userAvailabilityException.findMany({
        where: { userId },
        orderBy: [{ date: 'asc' }],
    });
};

export const addAvailabilityException = async (
    userId: string,
    payload: {
        date: Date | string;
        isUnavailable: boolean;
        startTime?: string | null;
        endTime?: string | null;
    },
    caller: CallerContext,
): Promise<UserAvailabilityException> => {
    await assertCanManageAvailability(userId, caller, 'exceptions', 'write');

    const date = parseAvailabilityExceptionDate(payload.date);
    validateAvailabilityExceptionInput({ ...payload, date: date.toISOString().split('T')[0] });

    const result = await prisma.userAvailabilityException.create({
        data: {
            userId,
            date,
            isUnavailable: payload.isUnavailable,
            startTime: payload.startTime || null,
            endTime: payload.endTime || null,
        },
    });

    void queueAvailabilityExceptionNotification({
        userId,
        date: date.toISOString().split('T')[0],
        isUnavailable: payload.isUnavailable,
        startTime: payload.startTime,
        endTime: payload.endTime,
    });

    return result;
};

export const removeAvailabilityException = async (
    userId: string,
    exceptionId: string,
    caller: CallerContext,
): Promise<void> => {
    await assertCanManageAvailability(userId, caller, 'exceptions', 'write');

    // Authorization and ownership check is performed at the repository/service boundary
    try {
        await prisma.userAvailabilityException.delete({
            where: { id: exceptionId, userId },
        });
    } catch (err: any) {
        if (err.code === 'P2025') {
            throw new ErrorHandler(StatusCodes.NOT_FOUND, 'Availability exception not found.');
        }
        throw err;
    }
};

/**
 * Retrieves the effective availability data (weekly + relevant exceptions) 
 * for a specific user and time range.
 */
export const getEffectiveAvailabilityData = async (
    userId: string,
    from: Date,
    to: Date,
    caller: CallerContext,
) => {
    await assertCanManageAvailability(userId, caller, 'exceptions', 'read');

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

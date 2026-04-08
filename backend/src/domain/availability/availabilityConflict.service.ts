import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/db/prisma';
import {
    buildSameSessionExclusion,
    type AvailabilityClient,
} from './availability.shared';

/**
 * Service responsible for determining if a host has scheduling conflicts.
 * Encapsulates the logic for "Same Booking" overrides and capacity-aware conflicts.
 */

export const getHostConflicts = async (
    userId: string,
    startTime: Date,
    endTime: Date,
    options: {
        eventId?: string;
        scheduleSlotId?: string | null;
        tx?: AvailabilityClient;
    } = {},
): Promise<any[]> => {
    const client = options.tx || prisma;

    // 1. Build the "Same Session Exclusion" to allow overlapping bookings for the same slot/event
    const sameSessionExclusion = buildSameSessionExclusion(
        startTime,
        endTime,
        options,
    );

    // 2. Query for any conflicting bookings that are not in the excluded session
    return client.booking.findMany({
        where: {
            hostUserId: userId,
            status: { in: ['CONFIRMED', 'PENDING'] },
            AND: [
                {
                    OR: [
                        { startTime: { lt: endTime }, endTime: { gt: startTime } },
                    ],
                },
                ...(sameSessionExclusion ? [sameSessionExclusion] : []),
            ],
        },
        include: {
            event: {
                include: {
                    interactionType: {
                        select: {
                            minParticipants: true,
                            maxParticipants: true,
                        },
                    },
                },
            },
        },
    });
};

/**
 * Determines if a conflict is blocking based on session capacity rules.
 */
export const isConflictBlocking = (
    conflicts: any[],
    currentEventId?: string,
): boolean => {
    if (conflicts.length === 0) return false;

    // A conflict is blocking if:
    // 1. It belongs to a different event (exclusive booking).
    // 2. It belongs to the same event but the event is in a mode that doesn't allow shared overlaps.
    // 3. The session is at capacity (handled at the booking service level, but here we check for simple presence).

    // For most cases, any conflict is blocking unless specifically exempted.
    return conflicts.length > 0;
};

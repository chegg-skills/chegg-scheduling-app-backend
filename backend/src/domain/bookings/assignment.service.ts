import { AssignmentStrategy, Prisma, PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { isHostAvailable } from "../availability/availability.service";

export type HostCandidate = {
    hostUserId: string;
    hostOrder: number;
    hostUser: {
        zoomIsvLink: string | null;
    };
};

export type AssignmentContext = {
    prisma: Prisma.TransactionClient | PrismaClient;
    eventId: string;
    start: Date;
    end: Date;
    bookingMode: string;
    allowSharedSessionOverlap: boolean;
    matchedScheduleSlotId?: string | null;
};

export interface IAssignmentStrategy {
    resolveHost(
        candidates: HostCandidate[],
        context: AssignmentContext,
    ): Promise<{ assignedHostId: string; meetingJoinUrl: string | null }>;
}

export class DirectAssignmentStrategy implements IAssignmentStrategy {
    async resolveHost(
        candidates: HostCandidate[],
        context: AssignmentContext,
    ): Promise<{ assignedHostId: string; meetingJoinUrl: string | null }> {
        const primaryHost = candidates[0];
        if (!primaryHost) {
            throw new ErrorHandler(
                StatusCodes.SERVICE_UNAVAILABLE,
                "No active hosts available for this event.",
            );
        }

        const available = await isHostAvailable(
            primaryHost.hostUserId,
            context.start,
            context.end,
            {
                ignoreWeeklySchedule: context.bookingMode === "FIXED_SLOTS",
                eventId: context.allowSharedSessionOverlap ? context.eventId : undefined,
                scheduleSlotId: context.allowSharedSessionOverlap
                    ? context.matchedScheduleSlotId ?? null
                    : undefined,
                tx: context.prisma,
            },
        );

        if (!available) {
            throw new ErrorHandler(
                StatusCodes.CONFLICT,
                "The designated host is not available at this time.",
            );
        }

        return {
            assignedHostId: primaryHost.hostUserId,
            meetingJoinUrl: primaryHost.hostUser.zoomIsvLink,
        };
    }
}

export class RoundRobinAssignmentStrategy implements IAssignmentStrategy {
    async resolveHost(
        candidates: HostCandidate[],
        context: AssignmentContext,
    ): Promise<{ assignedHostId: string; meetingJoinUrl: string | null }> {
        // Fetch current routing state
        const routingState =
            (await context.prisma.eventRoutingState.findUnique({
                where: { eventId: context.eventId },
            })) || { nextHostOrder: 1 };

        const sortedHosts = [...candidates].sort((a, b) => a.hostOrder - b.hostOrder);
        const maxOrder = Math.max(...sortedHosts.map((h) => h.hostOrder));

        let startIndex = sortedHosts.findIndex(
            (h) => h.hostOrder >= routingState.nextHostOrder,
        );
        if (startIndex === -1) startIndex = 0;

        for (let i = 0; i < sortedHosts.length; i++) {
            const index = (startIndex + i) % sortedHosts.length;
            const candidate = sortedHosts[index];

            const available = await isHostAvailable(
                candidate.hostUserId,
                context.start,
                context.end,
                {
                    ignoreWeeklySchedule: context.bookingMode === "FIXED_SLOTS",
                    eventId: context.allowSharedSessionOverlap
                        ? context.eventId
                        : undefined,
                    scheduleSlotId: context.allowSharedSessionOverlap
                        ? context.matchedScheduleSlotId ?? null
                        : undefined,
                    tx: context.prisma,
                },
            );

            if (available) {
                // Update routing state for next time
                const nextOrder = (candidate.hostOrder % maxOrder) + 1;
                await context.prisma.eventRoutingState.upsert({
                    where: { eventId: context.eventId },
                    update: { nextHostOrder: nextOrder },
                    create: { eventId: context.eventId, nextHostOrder: nextOrder },
                });

                return {
                    assignedHostId: candidate.hostUserId,
                    meetingJoinUrl: candidate.hostUser.zoomIsvLink,
                };
            }
        }

        throw new ErrorHandler(
            StatusCodes.CONFLICT,
            "No available hosts found for the requested time slot.",
        );
    }
}

export function getAssignmentStrategy(
    strategy: AssignmentStrategy,
): IAssignmentStrategy {
    switch (strategy) {
        case AssignmentStrategy.DIRECT:
            return new DirectAssignmentStrategy();
        case AssignmentStrategy.ROUND_ROBIN:
            return new RoundRobinAssignmentStrategy();
        default:
            throw new ErrorHandler(
                StatusCodes.INTERNAL_SERVER_ERROR,
                `Unsupported assignment strategy: ${strategy}`,
            );
    }
}

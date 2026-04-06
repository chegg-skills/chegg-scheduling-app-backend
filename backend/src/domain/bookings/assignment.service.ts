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

type AssignmentResult = {
    assignedHostId: string;
    meetingJoinUrl: string | null;
};

const ensureCandidatesExist = (candidates: HostCandidate[]): void => {
    if (candidates.length === 0) {
        throw new ErrorHandler(
            StatusCodes.SERVICE_UNAVAILABLE,
            "No active hosts available for this event.",
        );
    }
};

const buildAvailabilityOptions = (context: AssignmentContext) => ({
    ignoreWeeklySchedule: context.bookingMode === "FIXED_SLOTS",
    eventId: context.allowSharedSessionOverlap ? context.eventId : undefined,
    scheduleSlotId: context.allowSharedSessionOverlap
        ? context.matchedScheduleSlotId ?? null
        : undefined,
    tx: context.prisma,
});

const isCandidateAvailable = async (
    candidate: HostCandidate,
    context: AssignmentContext,
): Promise<boolean> => {
    return isHostAvailable(
        candidate.hostUserId,
        context.start,
        context.end,
        buildAvailabilityOptions(context),
    );
};

const toAssignmentResult = (candidate: HostCandidate): AssignmentResult => ({
    assignedHostId: candidate.hostUserId,
    meetingJoinUrl: candidate.hostUser.zoomIsvLink,
});

const updateRoutingState = async (
    context: AssignmentContext,
    currentHostOrder: number,
    maxOrder: number,
): Promise<void> => {
    const nextOrder = (currentHostOrder % maxOrder) + 1;
    await context.prisma.eventRoutingState.upsert({
        where: { eventId: context.eventId },
        update: { nextHostOrder: nextOrder },
        create: { eventId: context.eventId, nextHostOrder: nextOrder },
    });
};

export interface IAssignmentStrategy {
    resolveHost(
        candidates: HostCandidate[],
        context: AssignmentContext,
    ): Promise<AssignmentResult>;
}

export class DirectAssignmentStrategy implements IAssignmentStrategy {
    async resolveHost(
        candidates: HostCandidate[],
        context: AssignmentContext,
    ): Promise<AssignmentResult> {
        ensureCandidatesExist(candidates);

        const primaryHost = candidates[0];
        const available = await isCandidateAvailable(primaryHost, context);

        if (!available) {
            throw new ErrorHandler(
                StatusCodes.CONFLICT,
                "The designated host is not available at this time.",
            );
        }

        return toAssignmentResult(primaryHost);
    }
}

export class RoundRobinAssignmentStrategy implements IAssignmentStrategy {
    async resolveHost(
        candidates: HostCandidate[],
        context: AssignmentContext,
    ): Promise<AssignmentResult> {
        ensureCandidatesExist(candidates);

        const routingState =
            (await context.prisma.eventRoutingState.findUnique({
                where: { eventId: context.eventId },
            })) || { nextHostOrder: 1 };

        const sortedHosts = [...candidates].sort((a, b) => a.hostOrder - b.hostOrder);
        const maxOrder = Math.max(...sortedHosts.map((host) => host.hostOrder));

        let startIndex = sortedHosts.findIndex(
            (host) => host.hostOrder >= routingState.nextHostOrder,
        );
        if (startIndex === -1) {
            startIndex = 0;
        }

        for (let offset = 0; offset < sortedHosts.length; offset++) {
            const index = (startIndex + offset) % sortedHosts.length;
            const candidate = sortedHosts[index];

            if (await isCandidateAvailable(candidate, context)) {
                await updateRoutingState(context, candidate.hostOrder, maxOrder);
                return toAssignmentResult(candidate);
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

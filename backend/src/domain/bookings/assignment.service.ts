import { AssignmentStrategy, Prisma, PrismaClient } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { isCoachAvailable } from "../availability/availability.service";

export type CoachCandidate = {
  coachUserId: string;
  coachOrder: number;
  coachUser: {
    zoomIsvLink: string | null;
  };
};

// Legacy alias — remove once all callers are updated
export type HostCandidate = CoachCandidate;

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
  assignedCoachId: string;
  meetingJoinUrl: string | null;
};

const ensureCandidatesExist = (candidates: CoachCandidate[]): void => {
  if (candidates.length === 0) {
    throw new ErrorHandler(
      StatusCodes.SERVICE_UNAVAILABLE,
      "No active coaches available for this event.",
    );
  }
};

const buildAvailabilityOptions = (context: AssignmentContext) => ({
  ignoreWeeklySchedule: context.bookingMode === "FIXED_SLOTS",
  eventId: context.allowSharedSessionOverlap ? context.eventId : undefined,
  scheduleSlotId: context.allowSharedSessionOverlap
    ? (context.matchedScheduleSlotId ?? null)
    : undefined,
  tx: context.prisma,
});

const isCandidateAvailable = async (
  candidate: CoachCandidate,
  context: AssignmentContext,
): Promise<boolean> => {
  return isCoachAvailable(
    candidate.coachUserId,
    context.start,
    context.end,
    buildAvailabilityOptions(context),
  );
};

const toAssignmentResult = (candidate: CoachCandidate): AssignmentResult => ({
  assignedCoachId: candidate.coachUserId,
  meetingJoinUrl: candidate.coachUser.zoomIsvLink,
});

const updateRoutingState = async (
  context: AssignmentContext,
  currentCoachOrder: number,
  maxOrder: number,
): Promise<void> => {
  const nextOrder = (currentCoachOrder % maxOrder) + 1;
  await context.prisma.eventRoutingState.upsert({
    where: { eventId: context.eventId },
    update: { nextCoachOrder: nextOrder },
    create: { eventId: context.eventId, nextCoachOrder: nextOrder },
  });
};

export interface IAssignmentStrategy {
  resolveCoach(candidates: CoachCandidate[], context: AssignmentContext): Promise<AssignmentResult>;
}

export class DirectAssignmentStrategy implements IAssignmentStrategy {
  async resolveCoach(
    candidates: CoachCandidate[],
    context: AssignmentContext,
  ): Promise<AssignmentResult> {
    ensureCandidatesExist(candidates);

    const primaryCoach = candidates[0];
    const available = await isCandidateAvailable(primaryCoach, context);

    if (!available) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        "The designated coach is not available at this time.",
      );
    }

    return toAssignmentResult(primaryCoach);
  }
}

export class RoundRobinAssignmentStrategy implements IAssignmentStrategy {
  async resolveCoach(
    candidates: CoachCandidate[],
    context: AssignmentContext,
  ): Promise<AssignmentResult> {
    ensureCandidatesExist(candidates);

    const routingState = (await context.prisma.eventRoutingState.findUnique({
      where: { eventId: context.eventId },
    })) || { nextCoachOrder: 1 };

    const sortedCandidates = [...candidates].sort((a, b) => a.coachOrder - b.coachOrder);
    const maxOrder = Math.max(...sortedCandidates.map((c) => c.coachOrder));

    let startIndex = sortedCandidates.findIndex(
      (c) => c.coachOrder >= routingState.nextCoachOrder,
    );
    if (startIndex === -1) {
      startIndex = 0;
    }

    for (let offset = 0; offset < sortedCandidates.length; offset++) {
      const index = (startIndex + offset) % sortedCandidates.length;
      const candidate = sortedCandidates[index];

      if (await isCandidateAvailable(candidate, context)) {
        await updateRoutingState(context, candidate.coachOrder, maxOrder);
        return toAssignmentResult(candidate);
      }
    }

    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "No available coaches found for the requested time slot.",
    );
  }
}

export function getAssignmentStrategy(strategy: AssignmentStrategy): IAssignmentStrategy {
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

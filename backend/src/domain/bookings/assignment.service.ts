import { AssignmentStrategy, BookingStatus, Prisma, PrismaClient } from "@prisma/client";
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
  teamId: string;
  start: Date;
  end: Date;
  bookingMode: string;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  /** Excludes this booking's own record from each candidate's conflict check —
   * set when rescheduling, so the booking's own prior time doesn't count against it. */
  excludeBookingId?: string;
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
  excludeBookingId: context.excludeBookingId,
  tx: context.prisma,
});

const isCandidateAvailable = async (
  candidate: CoachCandidate,
  context: AssignmentContext,
): Promise<boolean> => {
  const weeklyOverride =
    context.bookingMode !== "FIXED_SLOTS"
      ? await context.prisma.eventCoachWeeklyAvailability.findMany({
          where: { eventId: context.eventId, coachUserId: candidate.coachUserId },
          select: { dayOfWeek: true, startTime: true, endTime: true },
        })
      : [];
  return isCoachAvailable(
    candidate.coachUserId,
    context.start,
    context.end,
    { ...buildAvailabilityOptions(context), weeklyOverride },
  );
};

const toAssignmentResult = (candidate: CoachCandidate): AssignmentResult => ({
  assignedCoachId: candidate.coachUserId,
  meetingJoinUrl: candidate.coachUser.zoomIsvLink,
});

export const getRoutingState = async (
  prisma: Prisma.TransactionClient | PrismaClient,
  eventId: string,
) => {
  return (
    (await prisma.eventRoutingState.findUnique({
      where: { eventId },
    })) || { nextCoachOrder: 1 }
  );
};

export const updateRoutingState = async (
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

    const routingState = await getRoutingState(context.prisma, context.eventId);

    // Count total sessions per coach across all events in the team — both
    // COACH_AVAILABILITY bookings AND fixed slot assignments — so a coach
    // heavily loaded by either session type is deprioritised when assigning next.
    const [bookingCounts, slotCounts] = await Promise.all([
      context.prisma.booking.groupBy({
        by: ["coachUserId"],
        where: {
          teamId: context.teamId,
          coachUserId: { in: candidates.map((c) => c.coachUserId) },
          status: { not: BookingStatus.CANCELLED },
        },
        _count: { coachUserId: true },
      }),
      context.prisma.eventScheduleSlot.groupBy({
        by: ["assignedCoachId"],
        where: {
          event: { teamId: context.teamId },
          assignedCoachId: { in: candidates.map((c) => c.coachUserId) },
          isActive: true,
          isCancelled: false,
        },
        _count: { assignedCoachId: true },
      }),
    ]);
    const countMap = new Map(bookingCounts.map((r) => [r.coachUserId, r._count.coachUserId]));
    for (const r of slotCounts) {
      if (!r.assignedCoachId) continue;
      countMap.set(r.assignedCoachId, (countMap.get(r.assignedCoachId) ?? 0) + r._count.assignedCoachId);
    }

    const maxOrder = Math.max(...candidates.map((c) => c.coachOrder));

    // Primary sort: fewest team-wide bookings first.
    // Tiebreaker: rotation cursor (nextCoachOrder) so equal-count coaches cycle fairly.
    const sorted = [...candidates].sort((a, b) => {
      const countDiff = (countMap.get(a.coachUserId) ?? 0) - (countMap.get(b.coachUserId) ?? 0);
      if (countDiff !== 0) return countDiff;
      const aRot =
        a.coachOrder >= routingState.nextCoachOrder ? a.coachOrder : a.coachOrder + maxOrder;
      const bRot =
        b.coachOrder >= routingState.nextCoachOrder ? b.coachOrder : b.coachOrder + maxOrder;
      return aRot - bRot;
    });

    for (const candidate of sorted) {
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

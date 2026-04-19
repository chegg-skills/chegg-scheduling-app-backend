import { AssignmentStrategy, BookingStatus, Prisma, SessionLeadershipStrategy } from "@prisma/client";
import { INTERACTION_TYPE_CAPS, type InteractionType } from "../../shared/constants/interactionType";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { isCoachAvailable } from "../availability/availability.service";
import {
  type AssignmentContext,
  getAssignmentStrategy,
  type CoachCandidate,
  getRoutingState,
  updateRoutingState,
} from "./assignment.service";
import type { BookableEvent } from "./booking.shared";

export type ResolvedBookingCoachSelection = {
  assignedCoachId: string;
  meetingJoinUrl: string | null;
  coCoachUserIds: string[];
};

type ResolveBookingCoachSelectionInput = {
  preferredCoachId?: string;
  activeCoaches: CoachCandidate[];
  event: any; // Using any for event to avoid type issues during migration
  start: Date;
  end: Date;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  tx: Prisma.TransactionClient;
};

const buildAvailabilityOptions = ({
  event,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: Pick<
  ResolveBookingCoachSelectionInput,
  "event" | "allowSharedSessionOverlap" | "matchedScheduleSlotId" | "tx"
>) => ({
  ignoreWeeklySchedule: event.bookingMode === "FIXED_SLOTS",
  eventId: allowSharedSessionOverlap ? event.id : undefined,
  scheduleSlotId: allowSharedSessionOverlap ? (matchedScheduleSlotId ?? null) : undefined,
  tx,
});

const buildAssignmentContext = ({
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: Omit<
  ResolveBookingCoachSelectionInput,
  "preferredCoachId" | "activeCoaches"
>): AssignmentContext => ({
  prisma: tx,
  eventId: event.id,
  start,
  end,
  bookingMode: event.bookingMode,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
});

const assertHostAvailability = async ({
  coachUserId,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
  unavailableMessage,
}: {
  coachUserId: string;
  event: BookableEvent;
  start: Date;
  end: Date;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  tx: Prisma.TransactionClient;
  unavailableMessage: string;
}): Promise<void> => {
  const available = await isCoachAvailable(
    coachUserId,
    start,
    end,
    buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, tx }),
  );

  if (!available) {
    throw new ErrorHandler(StatusCodes.CONFLICT, unavailableMessage);
  }
};

const resolvePreferredSingleHost = async ({
  preferredCoachId,
  activeCoaches,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: ResolveBookingCoachSelectionInput & {
  preferredCoachId: string;
}): Promise<ResolvedBookingCoachSelection> => {
  const preferredHost = activeCoaches.find((candidate) => candidate.coachUserId === preferredCoachId);

  if (!preferredHost) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Specified coach is not eligible for this event.",
    );
  }

  await assertHostAvailability({
    coachUserId: preferredCoachId,
    event,
    start,
    end,
    allowSharedSessionOverlap,
    matchedScheduleSlotId,
    tx,
    unavailableMessage: "Coach is not available.",
  });

  return {
    assignedCoachId: preferredCoachId,
    meetingJoinUrl: preferredHost.coachUser.zoomIsvLink ?? null,
    coCoachUserIds: [],
  };
};

const resolveStrategyLead = async ({
  activeCoaches,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId">): Promise<{
  assignedCoachId: string;
  meetingJoinUrl: string | null;
}> => {
  const strategy = getAssignmentStrategy(event.assignmentStrategy);
  const result = await strategy.resolveCoach(
    activeCoaches,
    buildAssignmentContext({
      event,
      start,
      end,
      allowSharedSessionOverlap,
      matchedScheduleSlotId,
      tx,
    }),
  );

  if (!result.assignedCoachId) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "No available coaches found.");
  }

  return result;
};

const resolveSingleHostSelection = async (
  input: ResolveBookingCoachSelectionInput,
): Promise<ResolvedBookingCoachSelection> => {
  if (input.preferredCoachId) {
    return resolvePreferredSingleHost({ ...input, preferredCoachId: input.preferredCoachId });
  }

  const result = await resolveStrategyLead(input);
  return {
    assignedCoachId: result.assignedCoachId,
    meetingJoinUrl: result.meetingJoinUrl,
    coCoachUserIds: [],
  };
};

const resolveFixedLeadSelection = async (
  input: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId">,
): Promise<{ assignedCoachId: string; meetingJoinUrl: string | null }> => {
  const fixedLeadCoachId = input.event.fixedLeadCoachId ?? undefined;

  if (!fixedLeadCoachId) {
    throw new ErrorHandler(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Event configured for FIXED_LEAD but no lead coach is set.",
    );
  }

  const fixedLeadHost = input.activeCoaches.find(
    (candidate) => candidate.coachUserId === fixedLeadCoachId,
  );
  if (!fixedLeadHost) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The fixed lead coach is no longer eligible for this event.",
    );
  }

  await assertHostAvailability({
    coachUserId: fixedLeadCoachId,
    event: input.event,
    start: input.start,
    end: input.end,
    allowSharedSessionOverlap: input.allowSharedSessionOverlap,
    matchedScheduleSlotId: input.matchedScheduleSlotId,
    tx: input.tx,
    unavailableMessage: "The fixed lead coach is not available at this time.",
  });

  return {
    assignedCoachId: fixedLeadCoachId,
    meetingJoinUrl: fixedLeadHost.coachUser.zoomIsvLink ?? null,
  };
};

const resolveCollaborativeCoHosts = async ({
  activeCoaches,
  leadCoachId,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId"> & {
  leadCoachId: string;
}): Promise<string[]> => {
  const candidatesCount = activeCoaches.length;
  if (candidatesCount <= 1) return [];

  const routingState = await getRoutingState(tx, event.id);
  const sortedCandidates = [...activeCoaches].sort((a, b) => a.coachOrder - b.coachOrder);
  const maxOrder = Math.max(...sortedCandidates.map((c) => c.coachOrder));

  // Determine where to start searching based on the nextCoachOrder cursor
  let startIndex = sortedCandidates.findIndex((c) => c.coachOrder >= routingState.nextCoachOrder);
  if (startIndex === -1) startIndex = 0;

  const availableCoHosts: string[] = [];
  const targetCount = (event as any).targetCoHostCount ?? null;

  const context = buildAssignmentContext({
    event,
    start,
    end,
    allowSharedSessionOverlap,
    matchedScheduleSlotId,
    tx,
  });

  for (let i = 0; i < candidatesCount; i++) {
    const index = (startIndex + i) % candidatesCount;
    const candidate = sortedCandidates[index];

    // Skip the lead coach
    if (candidate.coachUserId === leadCoachId) continue;

    // Check if we already have enough co-hosts
    if (targetCount !== null && availableCoHosts.length >= targetCount) break;

    const isAvailable = await isCoachAvailable(
      candidate.coachUserId,
      start,
      end,
      buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, tx }),
    );

    if (isAvailable) {
      availableCoHosts.push(candidate.coachUserId);
      // Advance the core rotation cursor every time a co-host is assigned
      await updateRoutingState(context, candidate.coachOrder, maxOrder);
    }
  }

  // Graceful degradation logic remains unchanged...
  const coHostPoolSize = candidatesCount - 1;
  if (coHostPoolSize > 0 && availableCoHosts.length === 0) {
    console.warn(
      `[booking] No co-hosts available for event ${(event as any).id} at ${start.toISOString()}. ` +
      `Candidates checked: ${coHostPoolSize}. ` +
      `Session will proceed with lead coach ${leadCoachId} only.`,
    );
  }

  return availableCoHosts;
};

export const resolveBookingCoachSelection = async (
  input: ResolveBookingCoachSelectionInput,
): Promise<ResolvedBookingCoachSelection> => {
  const { event, tx, start } = input;
  const isDirect = event.assignmentStrategy === AssignmentStrategy.DIRECT;
  const caps = INTERACTION_TYPE_CAPS[event.interactionType as InteractionType];

  // 1. Group Session Consistency: If multiple participants are allowed, check if a session
  // is already established for this slot. Reuse the existing coaching team if so.
  if (caps.multipleParticipants) {
    const existingSession = await tx.booking.findFirst({
      where: {
        eventId: event.id,
        startTime: start,
        status: { not: BookingStatus.CANCELLED },
      },
      select: {
        coachUserId: true,
        coCoachUserIds: true,
        coach: { select: { zoomIsvLink: true } },
      },
    });

    if (existingSession) {
      return {
        assignedCoachId: existingSession.coachUserId,
        meetingJoinUrl: existingSession.coach.zoomIsvLink,
        coCoachUserIds: existingSession.coCoachUserIds,
      };
    }
  }

  if (event.sessionLeadershipStrategy === ("SINGLE_COACH" as any) || event.sessionLeadershipStrategy === "SINGLE_HOST") {
    // 2. If we have a matched schedule slot with an assigned coach, override everything else
    if (input.matchedScheduleSlotId) {
      const slot = await tx.eventScheduleSlot.findUnique({
        where: { id: input.matchedScheduleSlotId },
        select: { assignedCoachId: true, assignedCoach: { select: { zoomIsvLink: true } } }
      });

      if (slot?.assignedCoachId) {
        return {
          assignedCoachId: slot.assignedCoachId,
          meetingJoinUrl: slot.assignedCoach?.zoomIsvLink ?? null,
          coCoachUserIds: [],
        };
      }
    }

    // 2. Fallback to DIRECT events logic...
    if (isDirect && event.fixedLeadCoachId && !input.preferredCoachId) {
      return resolveSingleHostSelection({
        ...input,
        preferredCoachId: event.fixedLeadCoachId,
      });
    }
    return resolveSingleHostSelection(input);
  }

  // Multi-coach session: determine lead coach.
  // FIXED_LEAD leadership OR DIRECT strategy with a designated coach both pin the lead.
  const useFixedLead =
    event.sessionLeadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD ||
    (isDirect && !!event.fixedLeadCoachId);

  const leadSelection = useFixedLead
    ? await resolveFixedLeadSelection(input)
    : await resolveStrategyLead(input);

  return {
    assignedCoachId: leadSelection.assignedCoachId,
    meetingJoinUrl: leadSelection.meetingJoinUrl,
    coCoachUserIds: await resolveCollaborativeCoHosts({
      ...input,
      leadCoachId: leadSelection.assignedCoachId,
    }),
  };
};

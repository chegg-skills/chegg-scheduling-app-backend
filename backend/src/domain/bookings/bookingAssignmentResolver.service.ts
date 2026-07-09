import {
  AssignmentStrategy,
  BookingStatus,
  MeetingLinkSource,
  Prisma,
  SessionLeadershipStrategy,
} from "@prisma/client";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { isCoachAvailable } from "../availability/availability.service";
import { getRequestLogger } from "../../shared/logging/requestContext";
import {
  type AssignmentContext,
  getAssignmentStrategy,
  type CoachCandidate,
  getRoutingState,
  updateRoutingState,
} from "./assignment.service";
import { getMeetingJoinUrl, type BookableEvent } from "./booking.shared";

export type ResolvedBookingCoachSelection = {
  assignedCoachId: string | null;
  meetingJoinUrl: string | null;
  coCoachUserIds: string[];
};

type ResolveBookingCoachSelectionInput = {
  preferredCoachId?: string;
  activeCoaches: CoachCandidate[];
  event: BookableEvent;
  start: Date;
  end: Date;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  /** Excludes this booking's own record from every coach's conflict check —
   * set on reschedule so the booking's own prior time doesn't count as a
   * conflict against itself. Left undefined for new bookings and follow-ups,
   * which have no "self" to exclude. */
  excludeBookingId?: string;
  tx: Prisma.TransactionClient;
};

const buildAvailabilityOptions = ({
  event,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
}: Pick<
  ResolveBookingCoachSelectionInput,
  "event" | "allowSharedSessionOverlap" | "matchedScheduleSlotId" | "excludeBookingId" | "tx"
>) => ({
  ignoreWeeklySchedule: event.bookingMode === "FIXED_SLOTS",
  eventId: allowSharedSessionOverlap ? event.id : undefined,
  scheduleSlotId: allowSharedSessionOverlap ? (matchedScheduleSlotId ?? null) : undefined,
  excludeBookingId,
  tx,
});

const buildAssignmentContext = ({
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
}: Omit<
  ResolveBookingCoachSelectionInput,
  "preferredCoachId" | "activeCoaches"
>): AssignmentContext => ({
  prisma: tx,
  eventId: event.id,
  teamId: event.teamId,
  start,
  end,
  bookingMode: event.bookingMode,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
});

const isHostAvailable = async ({
  coachUserId,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  excludeBookingId,
  tx,
}: {
  coachUserId: string;
  event: BookableEvent;
  start: Date;
  end: Date;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  excludeBookingId?: string;
  tx: Prisma.TransactionClient;
}): Promise<boolean> => {
  const weeklyOverride =
    event.bookingMode !== "FIXED_SLOTS"
      ? await tx.eventCoachWeeklyAvailability.findMany({
          where: { eventId: event.id, coachUserId },
          select: { dayOfWeek: true, startTime: true, endTime: true },
        })
      : [];

  return isCoachAvailable(
    coachUserId,
    start,
    end,
    {
      ...buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, excludeBookingId, tx }),
      weeklyOverride,
    },
  );
};

const assertHostAvailability = async ({
  unavailableMessage,
  ...params
}: Parameters<typeof isHostAvailable>[0] & { unavailableMessage: string }): Promise<void> => {
  if (!(await isHostAvailable(params))) {
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
  excludeBookingId,
  tx,
}: ResolveBookingCoachSelectionInput & {
  preferredCoachId: string;
}): Promise<ResolvedBookingCoachSelection> => {
  const preferredHost = activeCoaches.find(
    (candidate) => candidate.coachUserId === preferredCoachId,
  );

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
    excludeBookingId,
    tx,
    unavailableMessage: "Coach is not available.",
  });

  return {
    assignedCoachId: preferredCoachId,
    meetingJoinUrl: getMeetingJoinUrl(event, preferredHost.coachUser.zoomIsvLink),
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
  excludeBookingId,
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
      excludeBookingId,
      tx,
    }),
  );

  if (!result.assignedCoachId) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "No available coaches found.");
  }

  return result;
};

const resolveViaStrategyLead = async (
  input: Omit<ResolveBookingCoachSelectionInput, "preferredCoachId">,
): Promise<ResolvedBookingCoachSelection> => {
  const result = await resolveStrategyLead(input);
  return {
    assignedCoachId: result.assignedCoachId,
    meetingJoinUrl: getMeetingJoinUrl(input.event, result.meetingJoinUrl),
    coCoachUserIds: [],
  };
};

// Security model: possession of a preferredCoachId doesn't necessarily mean the
// assignment must be pinned — see the ROUND_ROBIN branch below.
const resolveSingleHostSelection = async (
  input: ResolveBookingCoachSelectionInput,
): Promise<ResolvedBookingCoachSelection> => {
  if (!input.preferredCoachId) {
    return resolveViaStrategyLead(input);
  }

  if (input.event.assignmentStrategy !== AssignmentStrategy.ROUND_ROBIN) {
    // DIRECT (or an explicit fixed-lead pin): the assignment is a deliberate
    // binding, not an interchangeable pool — no fallback if the pinned coach
    // is unavailable.
    return resolvePreferredSingleHost({ ...input, preferredCoachId: input.preferredCoachId });
  }

  // ROUND_ROBIN: prefer the previously-assigned coach if still genuinely
  // available (excludeBookingId means their own prior record at this booking
  // no longer counts against them) — this keeps a rescheduled/follow-up
  // session with the same coach when nothing actually has to change. But the
  // pool is interchangeable by design, so if they're genuinely busy with
  // something else, fall back to the round-robin strategy (tries every
  // eligible coach, same as a brand-new booking) instead of failing outright.
  const preferredHost = input.activeCoaches.find(
    (candidate) => candidate.coachUserId === input.preferredCoachId,
  );
  const preferredAvailable =
    preferredHost !== undefined &&
    (await isHostAvailable({
      coachUserId: input.preferredCoachId,
      event: input.event,
      start: input.start,
      end: input.end,
      allowSharedSessionOverlap: input.allowSharedSessionOverlap,
      matchedScheduleSlotId: input.matchedScheduleSlotId,
      excludeBookingId: input.excludeBookingId,
      tx: input.tx,
    }));

  if (preferredHost && preferredAvailable) {
    return {
      assignedCoachId: input.preferredCoachId,
      meetingJoinUrl: getMeetingJoinUrl(input.event, preferredHost.coachUser.zoomIsvLink),
      coCoachUserIds: [],
    };
  }

  return resolveViaStrategyLead(input);
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
    excludeBookingId: input.excludeBookingId,
    tx: input.tx,
    unavailableMessage: "The fixed lead coach is not available at this time.",
  });

  return {
    assignedCoachId: fixedLeadCoachId,
    meetingJoinUrl: getMeetingJoinUrl(input.event, fixedLeadHost.coachUser.zoomIsvLink),
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
  excludeBookingId,
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
  const targetCount = event.targetCoHostCount ?? null;

  const context = buildAssignmentContext({
    event,
    start,
    end,
    allowSharedSessionOverlap,
    matchedScheduleSlotId,
    excludeBookingId,
    tx,
  });

  for (let i = 0; i < candidatesCount; i++) {
    const index = (startIndex + i) % candidatesCount;
    const candidate = sortedCandidates[index];

    // Skip the lead coach
    if (candidate.coachUserId === leadCoachId) continue;

    // Check if we already have enough co-hosts
    if (targetCount !== null && availableCoHosts.length >= targetCount) break;

    const coHostOverride =
      event.bookingMode !== "FIXED_SLOTS"
        ? await tx.eventCoachWeeklyAvailability.findMany({
            where: { eventId: event.id, coachUserId: candidate.coachUserId },
            select: { dayOfWeek: true, startTime: true, endTime: true },
          })
        : [];

    const isAvailable = await isCoachAvailable(
      candidate.coachUserId,
      start,
      end,
      {
        ...buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, excludeBookingId, tx }),
        weeklyOverride: coHostOverride,
      },
    );

    if (isAvailable) {
      availableCoHosts.push(candidate.coachUserId);
      // Advance the core rotation cursor every time a co-host is assigned.
      // This ensures fair workload distribution even if the Lead is fixed.
      await updateRoutingState(context, candidate.coachOrder, maxOrder);
    }
  }

  // Graceful degradation logic remains unchanged...
  const coHostPoolSize = candidatesCount - 1;
  if (coHostPoolSize > 0 && availableCoHosts.length === 0) {
    getRequestLogger().warn(
      { eventId: event.id, startTime: start.toISOString(), candidatesChecked: coHostPoolSize, leadCoachId },
      "No co-hosts available for session — proceeding with lead only.",
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

  // Anonymous booking: no coach assigned to the booking.
  // SESSION_LANDING_PAGE: meetingJoinUrl is set post-creation once sessionToken is known.
  // EVENT_LOCATION: use the shared event location URL directly.
  if (event.allowAnonymousBooking) {
    return {
      assignedCoachId: null,
      meetingJoinUrl:
        event.meetingLinkSource === MeetingLinkSource.SESSION_LANDING_PAGE
          ? null
          : event.locationValue || null,
      coCoachUserIds: [],
    };
  }

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
      // For FIXED_SLOTS, the slot's assignedCoachId is authoritative. If an admin has overridden
      // the slot's coach after initial bookings were made, new bookings must use the new coach —
      // not copy the old coach from an existing booking.
      if (event.bookingMode === "FIXED_SLOTS" && input.matchedScheduleSlotId) {
        const slot = await tx.eventScheduleSlot.findUnique({
          where: { id: input.matchedScheduleSlotId },
          select: { assignedCoachId: true, assignedCoach: { select: { zoomIsvLink: true } } },
        });
        if (slot?.assignedCoachId) {
          return {
            assignedCoachId: slot.assignedCoachId,
            meetingJoinUrl: getMeetingJoinUrl(event, slot.assignedCoach?.zoomIsvLink),
            coCoachUserIds: existingSession.coCoachUserIds,
          };
        }
      }

      return {
        assignedCoachId: existingSession.coachUserId,
        meetingJoinUrl: getMeetingJoinUrl(event, existingSession.coach?.zoomIsvLink),
        coCoachUserIds: existingSession.coCoachUserIds,
      };
    }
  }

  if (
    event.sessionLeadershipStrategy === SessionLeadershipStrategy.SINGLE_COACH ||
    (event.sessionLeadershipStrategy as string) === "SINGLE_HOST"
  ) {
    // 2. If we have a matched schedule slot with an assigned coach, override everything else
    if (input.matchedScheduleSlotId) {
      const slot = await tx.eventScheduleSlot.findUnique({
        where: { id: input.matchedScheduleSlotId },
        select: { assignedCoachId: true, assignedCoach: { select: { zoomIsvLink: true } } },
      });

      if (slot?.assignedCoachId) {
        return {
          assignedCoachId: slot.assignedCoachId,
          meetingJoinUrl: getMeetingJoinUrl(event, slot.assignedCoach?.zoomIsvLink),
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

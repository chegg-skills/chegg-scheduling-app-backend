import { Prisma, SessionLeadershipStrategy } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { isHostAvailable } from "../availability/availability.service";
import {
  type AssignmentContext,
  getAssignmentStrategy,
  type HostCandidate,
} from "./assignment.service";
import type { BookableEvent } from "./booking.shared";

export type ResolvedBookingHostSelection = {
  assignedHostId: string;
  meetingJoinUrl: string | null;
  coHostUserIds: string[];
};

type ResolveBookingHostSelectionInput = {
  preferredHostId?: string;
  activeHosts: HostCandidate[];
  event: BookableEvent;
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
  ResolveBookingHostSelectionInput,
  "event" | "allowSharedSessionOverlap" | "matchedScheduleSlotId" | "tx"
>) => ({
  ignoreWeeklySchedule: event.bookingMode === "FIXED_SLOTS",
  eventId: allowSharedSessionOverlap ? event.id : undefined,
  scheduleSlotId: allowSharedSessionOverlap ? matchedScheduleSlotId ?? null : undefined,
  tx,
});

const buildAssignmentContext = ({
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: Omit<ResolveBookingHostSelectionInput, "preferredHostId" | "activeHosts">): AssignmentContext => ({
  prisma: tx,
  eventId: event.id,
  start,
  end,
  bookingMode: event.bookingMode,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
});

const assertHostAvailability = async ({
  hostUserId,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
  unavailableMessage,
}: {
  hostUserId: string;
  event: BookableEvent;
  start: Date;
  end: Date;
  allowSharedSessionOverlap: boolean;
  matchedScheduleSlotId?: string | null;
  tx: Prisma.TransactionClient;
  unavailableMessage: string;
}): Promise<void> => {
  const available = await isHostAvailable(
    hostUserId,
    start,
    end,
    buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, tx }),
  );

  if (!available) {
    throw new ErrorHandler(StatusCodes.CONFLICT, unavailableMessage);
  }
};

const resolvePreferredSingleHost = async ({
  preferredHostId,
  activeHosts,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: ResolveBookingHostSelectionInput & { preferredHostId: string }): Promise<ResolvedBookingHostSelection> => {
  const preferredHost = activeHosts.find((candidate) => candidate.hostUserId === preferredHostId);

  if (!preferredHost) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Specified coach is not eligible for this event.",
    );
  }

  await assertHostAvailability({
    hostUserId: preferredHostId,
    event,
    start,
    end,
    allowSharedSessionOverlap,
    matchedScheduleSlotId,
    tx,
    unavailableMessage: "Coach is not available.",
  });

  return {
    assignedHostId: preferredHostId,
    meetingJoinUrl: preferredHost.hostUser.zoomIsvLink ?? null,
    coHostUserIds: [],
  };
};

const resolveStrategyLead = async ({
  activeHosts,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: Omit<ResolveBookingHostSelectionInput, "preferredHostId">): Promise<{
  assignedHostId: string;
  meetingJoinUrl: string | null;
}> => {
  const strategy = getAssignmentStrategy(event.assignmentStrategy);
  const result = await strategy.resolveHost(
    activeHosts,
    buildAssignmentContext({
      event,
      start,
      end,
      allowSharedSessionOverlap,
      matchedScheduleSlotId,
      tx,
    }),
  );

  if (!result.assignedHostId) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "No available coaches found.");
  }

  return result;
};

const resolveSingleHostSelection = async (
  input: ResolveBookingHostSelectionInput,
): Promise<ResolvedBookingHostSelection> => {
  if (input.preferredHostId) {
    return resolvePreferredSingleHost({ ...input, preferredHostId: input.preferredHostId });
  }

  const result = await resolveStrategyLead(input);
  return {
    assignedHostId: result.assignedHostId,
    meetingJoinUrl: result.meetingJoinUrl,
    coHostUserIds: [],
  };
};

const resolveFixedLeadSelection = async (
  input: Omit<ResolveBookingHostSelectionInput, "preferredHostId">,
): Promise<{ assignedHostId: string; meetingJoinUrl: string | null }> => {
  const fixedLeadHostId = input.event.fixedLeadHostId ?? undefined;

  if (!fixedLeadHostId) {
    throw new ErrorHandler(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Event configured for FIXED_LEAD but no lead coach is set.",
    );
  }

  const fixedLeadHost = input.activeHosts.find((candidate) => candidate.hostUserId === fixedLeadHostId);
  if (!fixedLeadHost) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The fixed lead coach is no longer eligible for this event.",
    );
  }

  await assertHostAvailability({
    hostUserId: fixedLeadHostId,
    event: input.event,
    start: input.start,
    end: input.end,
    allowSharedSessionOverlap: input.allowSharedSessionOverlap,
    matchedScheduleSlotId: input.matchedScheduleSlotId,
    tx: input.tx,
    unavailableMessage: "The fixed lead coach is not available at this time.",
  });

  return {
    assignedHostId: fixedLeadHostId,
    meetingJoinUrl: fixedLeadHost.hostUser.zoomIsvLink ?? null,
  };
};

const resolveCollaborativeCoHosts = async ({
  activeHosts,
  leadHostId,
  event,
  start,
  end,
  allowSharedSessionOverlap,
  matchedScheduleSlotId,
  tx,
}: Omit<ResolveBookingHostSelectionInput, "preferredHostId"> & {
  leadHostId: string;
}): Promise<string[]> => {
  const coHostCandidates = activeHosts.filter((candidate) => candidate.hostUserId !== leadHostId);

  const coHostAvailability = await Promise.all(
    coHostCandidates.map(async (candidate) => {
      const isAvailable = await isHostAvailable(
        candidate.hostUserId,
        start,
        end,
        buildAvailabilityOptions({ event, allowSharedSessionOverlap, matchedScheduleSlotId, tx }),
      );

      return isAvailable ? candidate.hostUserId : null;
    }),
  );

  return coHostAvailability.filter((hostUserId): hostUserId is string => Boolean(hostUserId));
};

export const resolveBookingHostSelection = async (
  input: ResolveBookingHostSelectionInput,
): Promise<ResolvedBookingHostSelection> => {
  if (input.event.sessionLeadershipStrategy === SessionLeadershipStrategy.SINGLE_HOST) {
    return resolveSingleHostSelection(input);
  }

  const leadSelection =
    input.event.sessionLeadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD
      ? await resolveFixedLeadSelection(input)
      : await resolveStrategyLead(input);

  return {
    assignedHostId: leadSelection.assignedHostId,
    meetingJoinUrl: leadSelection.meetingJoinUrl,
    coHostUserIds: await resolveCollaborativeCoHosts({
      ...input,
      leadHostId: leadSelection.assignedHostId,
    }),
  };
};

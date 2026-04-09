import {
  AssignmentStrategy,
  Prisma,
  SessionLeadershipStrategy,
} from "@prisma/client";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  getActiveInteractionType,
  getActiveOffering,
  isValidAssignmentStrategy,
  isValidLocationType,
  isValidSessionLeadershipStrategy,
  normalizeOptionalString,
  normalizeRequiredString,
  parseDurationSeconds,
  parseOptionalEnum,
  parseRequiredEnum,
  type CreateEventInput,
  type SafeEvent,
  type UpdateEventInput,
} from "./event.shared";
import { validateEventConfiguration } from "./eventHost.service";
import { resolveEventSchedulingConfig } from "./eventScheduling.service";

type ResolvedEventMutationContext = {
  offering: Awaited<ReturnType<typeof getActiveOffering>>;
  interactionType: Awaited<ReturnType<typeof getActiveInteractionType>>;
  assignmentStrategy: AssignmentStrategy;
  sessionLeadershipStrategy: SessionLeadershipStrategy;
  fixedLeadHostId: string | null;
  schedulingConfig: ReturnType<typeof resolveEventSchedulingConfig>;
};

const resolveSessionLeadershipConfig = ({
  interactionType,
  existingEvent,
  payload,
}: {
  interactionType: Awaited<ReturnType<typeof getActiveInteractionType>>;
  existingEvent?: SafeEvent;
  payload: Pick<UpdateEventInput, "sessionLeadershipStrategy" | "fixedLeadHostId">;
}): Pick<
  ResolvedEventMutationContext,
  "sessionLeadershipStrategy" | "fixedLeadHostId"
> => {
  // 1. Initial Default (The Baseline)
  let strategy: SessionLeadershipStrategy = interactionType.supportsSimultaneousCoaches
    ? SessionLeadershipStrategy.ROTATING_LEAD
    : SessionLeadershipStrategy.SINGLE_HOST;

  // 2. Override with DB Value (If we are updating)
  if (existingEvent) {
    strategy = existingEvent.sessionLeadershipStrategy;
  }

  // 3. Final Override with User Input (The highest priority)
  if (payload.sessionLeadershipStrategy !== undefined) {
    const userInput = parseOptionalEnum(
      payload.sessionLeadershipStrategy,
      "sessionLeadershipStrategy",
      isValidSessionLeadershipStrategy,
    );
    if (userInput) {
      strategy = userInput;
    }
  }

  // --- Same logic for the Lead Host ---
  let fixedLeadHostId = existingEvent?.fixedLeadHostId ?? null;

  if (payload.fixedLeadHostId !== undefined) {
    fixedLeadHostId = normalizeOptionalString(payload.fixedLeadHostId, "fixedLeadHostId");
  }

  return {
    sessionLeadershipStrategy: strategy,
    fixedLeadHostId,
  };
};

export const resolveCreateEventContext = async (
  payload: CreateEventInput,
): Promise<ResolvedEventMutationContext> => {
  const offeringId = normalizeRequiredString(payload.offeringId, "offeringId");
  const interactionTypeId = normalizeRequiredString(
    payload.interactionTypeId,
    "interactionTypeId",
  );

  const [offering, interactionType] = await Promise.all([
    getActiveOffering(offeringId),
    getActiveInteractionType(interactionTypeId),
  ]);

  const assignmentStrategy: AssignmentStrategy =
    parseOptionalEnum(
      payload.assignmentStrategy,
      "assignmentStrategy",
      isValidAssignmentStrategy,
    ) ?? AssignmentStrategy.DIRECT;

  const { sessionLeadershipStrategy, fixedLeadHostId } =
    resolveSessionLeadershipConfig({
      interactionType,
      payload,
    });

  validateEventConfiguration(interactionType, {
    assignmentStrategy,
    hostCount: 0,
    sessionLeadershipStrategy,
    fixedLeadHostId,
    hostUserIds: fixedLeadHostId ? [fixedLeadHostId] : [],
  });

  return {
    offering,
    interactionType,
    assignmentStrategy,
    sessionLeadershipStrategy,
    fixedLeadHostId,
    schedulingConfig: resolveEventSchedulingConfig(payload, interactionType),
  };
};

export const resolveUpdateEventContext = async ({
  payload,
  existingEvent,
}: {
  payload: UpdateEventInput;
  existingEvent: SafeEvent;
}): Promise<ResolvedEventMutationContext> => {
  const nextOfferingId =
    payload.offeringId !== undefined
      ? normalizeRequiredString(payload.offeringId, "offeringId")
      : existingEvent.offeringId;

  const nextInteractionTypeId =
    payload.interactionTypeId !== undefined
      ? normalizeRequiredString(payload.interactionTypeId, "interactionTypeId")
      : existingEvent.interactionTypeId;

  const [offering, interactionType] = await Promise.all([
    getActiveOffering(nextOfferingId),
    getActiveInteractionType(nextInteractionTypeId),
  ]);

  const assignmentStrategy: AssignmentStrategy =
    payload.assignmentStrategy !== undefined
      ? parseOptionalEnum(
        payload.assignmentStrategy,
        "assignmentStrategy",
        isValidAssignmentStrategy,
      ) ?? existingEvent.assignmentStrategy
      : existingEvent.assignmentStrategy;

  const { sessionLeadershipStrategy, fixedLeadHostId } =
    resolveSessionLeadershipConfig({
      interactionType,
      existingEvent,
      payload,
    });

  validateEventConfiguration(interactionType, {
    assignmentStrategy,
    hostCount: existingEvent.hosts.length,
    sessionLeadershipStrategy,
    fixedLeadHostId,
    hostUserIds: existingEvent.hosts.map((host) => host.hostUserId),
  });

  return {
    offering,
    interactionType,
    assignmentStrategy,
    sessionLeadershipStrategy,
    fixedLeadHostId,
    schedulingConfig: resolveEventSchedulingConfig(payload, interactionType, existingEvent),
  };
};

export const buildEventCreateData = ({
  payload,
  callerId,
  teamId,
  context,
}: {
  payload: CreateEventInput;
  callerId: string;
  teamId: string;
  context: ResolvedEventMutationContext;
}): Prisma.EventCreateInput => {
  const name = normalizeRequiredString(payload.name, "name");
  const durationSeconds = parseDurationSeconds(payload.durationSeconds);
  const locationType = parseRequiredEnum(
    payload.locationType,
    "locationType",
    isValidLocationType,
  );
  const locationValue = normalizeRequiredString(
    payload.locationValue,
    "locationValue",
  );

  const data: Prisma.EventCreateInput = {
    name,
    publicBookingSlug: createPublicBookingSlug(name, "event"),
    description: normalizeOptionalString(payload.description, "description"),
    offering: { connect: { id: context.offering.id } },
    interactionType: { connect: { id: context.interactionType.id } },
    assignmentStrategy: context.assignmentStrategy,
    durationSeconds,
    locationType,
    locationValue,
    isActive: payload.isActive ?? true,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadHostId: context.fixedLeadHostId,
    team: { connect: { id: teamId } },
    createdBy: { connect: { id: callerId } },
    updatedBy: { connect: { id: callerId } },
    ...context.schedulingConfig,
  };

  if (context.fixedLeadHostId) {
    data.hosts = {
      create: {
        hostUserId: context.fixedLeadHostId,
        hostOrder: 1,
        isActive: true,
      },
    };
  }

  return data;
};

export const buildEventUpdateData = ({
  payload,
  existingEvent,
  callerId,
  context,
}: {
  payload: UpdateEventInput;
  existingEvent: SafeEvent;
  callerId: string;
  context: ResolvedEventMutationContext;
}): Prisma.EventUpdateInput => {
  const updateData: Prisma.EventUpdateInput = {
    updatedBy: { connect: { id: callerId } },
    offering: { connect: { id: context.offering.id } },
    interactionType: { connect: { id: context.interactionType.id } },
    assignmentStrategy: context.assignmentStrategy,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadHostId: context.fixedLeadHostId,
    ...context.schedulingConfig,
  };

  if (payload.name !== undefined) {
    const normalizedName = normalizeRequiredString(payload.name, "name");
    updateData.name = normalizedName;

    if (!existingEvent.publicBookingSlug) {
      updateData.publicBookingSlug = createPublicBookingSlug(normalizedName, "event");
    }
  }

  if (payload.description !== undefined) {
    updateData.description = normalizeOptionalString(payload.description, "description");
  }

  if (payload.durationSeconds !== undefined) {
    updateData.durationSeconds = parseDurationSeconds(payload.durationSeconds);
  }

  const nextLocationType =
    payload.locationType !== undefined
      ? parseOptionalEnum(payload.locationType, "locationType", isValidLocationType)
      : existingEvent.locationType;

  const nextLocationValue =
    payload.locationValue !== undefined
      ? normalizeRequiredString(payload.locationValue, "locationValue")
      : existingEvent.locationValue;

  updateData.locationType = nextLocationType;
  updateData.locationValue = nextLocationValue;

  if (payload.isActive !== undefined) {
    updateData.isActive = Boolean(payload.isActive);
  }

  return updateData;
};

export const buildDuplicateEventData = ({
  sourceEvent,
  callerId,
}: {
  sourceEvent: SafeEvent;
  callerId: string;
}): Prisma.EventCreateInput => ({
  name: `Copy of ${sourceEvent.name}`,
  publicBookingSlug: createPublicBookingSlug(`Copy of ${sourceEvent.name}`, "event"),
  description: sourceEvent.description,
  offering: { connect: { id: sourceEvent.offeringId } },
  interactionType: { connect: { id: sourceEvent.interactionTypeId } },
  assignmentStrategy: sourceEvent.assignmentStrategy,
  durationSeconds: sourceEvent.durationSeconds,
  locationType: sourceEvent.locationType,
  locationValue: sourceEvent.locationValue,
  isActive: false,
  team: { connect: { id: sourceEvent.teamId } },
  createdBy: { connect: { id: callerId } },
  updatedBy: { connect: { id: callerId } },
  bookingMode: sourceEvent.bookingMode,
  allowedWeekdays: sourceEvent.allowedWeekdays,
  minimumNoticeMinutes: sourceEvent.minimumNoticeMinutes,
  minParticipantCount: sourceEvent.minParticipantCount,
  maxParticipantCount: sourceEvent.maxParticipantCount,
  sessionLeadershipStrategy: sourceEvent.sessionLeadershipStrategy,
  fixedLeadHostId: sourceEvent.fixedLeadHostId,
  bufferAfterMinutes: sourceEvent.bufferAfterMinutes,
});

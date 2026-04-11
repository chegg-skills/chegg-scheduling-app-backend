import {
  AssignmentStrategy,
  Prisma,
  SessionLeadershipStrategy,
} from "@prisma/client";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  getActiveInteractionType,
  getActiveOffering,
  isValidSessionLeadershipStrategy,
  type CreateEventInput,
  type SafeEvent,
  type UpdateEventInput,
} from "./event.shared";
import { validateEventConfiguration } from "./eventHost.service";
import { resolveEventSchedulingConfig } from "./eventScheduling.service";
import { CreateEventSchema, UpdateEventSchema } from "./event.schema";

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

  // 3. Final Override with User Input (Higher priority)
  if (payload.sessionLeadershipStrategy !== undefined) {
    if (isValidSessionLeadershipStrategy(payload.sessionLeadershipStrategy)) {
      strategy = payload.sessionLeadershipStrategy;
    }
  }

  // --- Same logic for the Lead Host ---
  let fixedLeadHostId = existingEvent?.fixedLeadHostId ?? null;

  if (payload.fixedLeadHostId !== undefined) {
    fixedLeadHostId = payload.fixedLeadHostId || null;
  }

  return {
    sessionLeadershipStrategy: strategy,
    fixedLeadHostId,
  };
};

export const resolveCreateEventContext = async (
  payload: CreateEventInput,
): Promise<ResolvedEventMutationContext> => {
  const validated = CreateEventSchema.body.parse(payload);

  const [offering, interactionType] = await Promise.all([
    getActiveOffering(validated.offeringId),
    getActiveInteractionType(validated.interactionTypeId),
  ]);

  const assignmentStrategy = validated.assignmentStrategy;

  const { sessionLeadershipStrategy, fixedLeadHostId } =
    resolveSessionLeadershipConfig({
      interactionType,
      payload: validated,
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
    schedulingConfig: resolveEventSchedulingConfig(validated, interactionType),
  };
};

export const resolveUpdateEventContext = async ({
  payload,
  existingEvent,
}: {
  payload: UpdateEventInput;
  existingEvent: SafeEvent;
}): Promise<ResolvedEventMutationContext> => {
  const validated = UpdateEventSchema.body.parse(payload);

  const nextOfferingId = validated.offeringId ?? existingEvent.offeringId;
  const nextInteractionTypeId = validated.interactionTypeId ?? existingEvent.interactionTypeId;

  const [offering, interactionType] = await Promise.all([
    getActiveOffering(nextOfferingId),
    getActiveInteractionType(nextInteractionTypeId),
  ]);

  const assignmentStrategy = validated.assignmentStrategy ?? existingEvent.assignmentStrategy;

  const { sessionLeadershipStrategy, fixedLeadHostId } =
    resolveSessionLeadershipConfig({
      interactionType,
      existingEvent,
      payload: validated,
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
    schedulingConfig: resolveEventSchedulingConfig(validated, interactionType, existingEvent),
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
  const validated = CreateEventSchema.body.parse(payload);

  const data: Prisma.EventCreateInput = {
    name: validated.name,
    publicBookingSlug: createPublicBookingSlug(validated.name, "event"),
    description: validated.description ?? undefined,
    offering: { connect: { id: context.offering.id } },
    interactionType: { connect: { id: context.interactionType.id } },
    assignmentStrategy: context.assignmentStrategy,
    durationSeconds: validated.durationSeconds,
    locationType: validated.locationType,
    locationValue: validated.locationValue,
    isActive: validated.isActive,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadHostId: context.fixedLeadHostId ?? undefined,
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
  const validated = UpdateEventSchema.body.parse(payload);

  const updateData: Prisma.EventUpdateInput = {
    updatedBy: { connect: { id: callerId } },
    offering: { connect: { id: context.offering.id } },
    interactionType: { connect: { id: context.interactionType.id } },
    assignmentStrategy: context.assignmentStrategy,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadHostId: context.fixedLeadHostId ?? undefined,
    ...context.schedulingConfig,
  };

  if (validated.name !== undefined) {
    updateData.name = validated.name;
    if (!existingEvent.publicBookingSlug) {
      updateData.publicBookingSlug = createPublicBookingSlug(validated.name, "event");
    }
  }

  if (validated.description !== undefined) {
    updateData.description = validated.description;
  }

  if (validated.durationSeconds !== undefined) {
    updateData.durationSeconds = validated.durationSeconds;
  }

  updateData.locationType = validated.locationType ?? existingEvent.locationType;
  updateData.locationValue = validated.locationValue ?? existingEvent.locationValue;

  if (validated.isActive !== undefined) {
    updateData.isActive = validated.isActive;
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
  description: sourceEvent.description ?? undefined,
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
  minParticipantCount: sourceEvent.minParticipantCount ?? undefined,
  maxParticipantCount: sourceEvent.maxParticipantCount ?? undefined,
  sessionLeadershipStrategy: sourceEvent.sessionLeadershipStrategy,
  fixedLeadHostId: sourceEvent.fixedLeadHostId ?? undefined,
  bufferAfterMinutes: sourceEvent.bufferAfterMinutes,
});

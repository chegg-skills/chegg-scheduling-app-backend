import { AssignmentStrategy, Prisma, SessionLeadershipStrategy } from "@prisma/client";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import {
  getActiveOffering,
  isValidSessionLeadershipStrategy,
  type CreateEventInput,
  type SafeEvent,
  type UpdateEventInput,
} from "./event.shared";
import { validateEventConfiguration } from "./eventCoach.service";
import { resolveEventSchedulingConfig } from "./eventScheduling.service";
import { CreateEventSchema, UpdateEventSchema } from "./event.schema";

type ResolvedEventMutationContext = {
  offering: Awaited<ReturnType<typeof getActiveOffering>>;
  interactionType: InteractionType;
  assignmentStrategy: AssignmentStrategy;
  sessionLeadershipStrategy: SessionLeadershipStrategy;
  fixedLeadCoachId: string | null;
  schedulingConfig: ReturnType<typeof resolveEventSchedulingConfig>;
};

const resolveSessionLeadershipConfig = ({
  interactionType,
  existingEvent,
  payload,
  assignmentStrategy,
}: {
  interactionType: InteractionType;
  existingEvent?: SafeEvent;
  payload: Pick<UpdateEventInput, "sessionLeadershipStrategy" | "fixedLeadCoachId">;
  assignmentStrategy: AssignmentStrategy;
}): Pick<ResolvedEventMutationContext, "sessionLeadershipStrategy" | "fixedLeadCoachId"> => {
  const caps = INTERACTION_TYPE_CAPS[interactionType];

  // 1. Initial Default (The Baseline)
  let strategy: SessionLeadershipStrategy = caps.multipleCoaches
    ? SessionLeadershipStrategy.ROTATING_LEAD
    : SessionLeadershipStrategy.SINGLE_COACH;

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

  // 4. Leadership Reform — always applied last for types that auto-derive leadership
  //    from assignment strategy (MANY_TO_ONE / MANY_TO_MANY). Cannot be overridden by
  //    user input; the assignmentStrategy is the single source of truth for these types.
  if (caps.derivesLeadershipFromAssignment) {
    strategy = assignmentStrategy === AssignmentStrategy.DIRECT
      ? SessionLeadershipStrategy.FIXED_LEAD
      : SessionLeadershipStrategy.ROTATING_LEAD;
  }

  // --- Same logic for the Lead Coach ---
  let fixedLeadCoachId = existingEvent?.fixedLeadCoachId ?? null;

  if (payload.fixedLeadCoachId !== undefined) {
    fixedLeadCoachId = payload.fixedLeadCoachId || null;
  }

  return {
    sessionLeadershipStrategy: strategy,
    fixedLeadCoachId,
  };
};

export const resolveCreateEventContext = async (
  payload: CreateEventInput,
): Promise<ResolvedEventMutationContext> => {
  const validated = CreateEventSchema.body.parse(payload);

  const offering = await getActiveOffering(validated.offeringId);
  const interactionType = validated.interactionType as InteractionType;
  const assignmentStrategy = validated.assignmentStrategy;

  const { sessionLeadershipStrategy, fixedLeadCoachId } = resolveSessionLeadershipConfig({
    interactionType,
    payload: validated,
    assignmentStrategy,
  });

  validateEventConfiguration({
    interactionType,
    assignmentStrategy,
    minCoachCount: validated.minCoachCount ?? 1,
    maxCoachCount: validated.maxCoachCount ?? null,
    coachCount: 0,
    sessionLeadershipStrategy,
    fixedLeadCoachId,
    coachUserIds: fixedLeadCoachId ? [fixedLeadCoachId] : [],
  });

  return {
    offering,
    interactionType,
    assignmentStrategy,
    sessionLeadershipStrategy,
    fixedLeadCoachId,
    schedulingConfig: resolveEventSchedulingConfig(validated),
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
  const nextInteractionType = (validated.interactionType ??
    existingEvent.interactionType) as InteractionType;

  const offering = await getActiveOffering(nextOfferingId);
  const assignmentStrategy = validated.assignmentStrategy ?? existingEvent.assignmentStrategy;

  const { sessionLeadershipStrategy, fixedLeadCoachId } = resolveSessionLeadershipConfig({
    interactionType: nextInteractionType,
    existingEvent,
    payload: validated,
    assignmentStrategy,
  });

  validateEventConfiguration({
    interactionType: nextInteractionType,
    assignmentStrategy,
    minCoachCount: validated.minCoachCount ?? existingEvent.minCoachCount,
    maxCoachCount:
      validated.maxCoachCount !== undefined ? validated.maxCoachCount : existingEvent.maxCoachCount,
    coachCount: existingEvent.coaches.length,
    sessionLeadershipStrategy,
    fixedLeadCoachId,
    coachUserIds: existingEvent.coaches.map((c) => c.coachUserId),
  });

  return {
    offering,
    interactionType: nextInteractionType,
    assignmentStrategy,
    sessionLeadershipStrategy,
    fixedLeadCoachId,
    schedulingConfig: resolveEventSchedulingConfig(validated, existingEvent),
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
    interactionType: context.interactionType,
    assignmentStrategy: context.assignmentStrategy,
    durationSeconds: validated.durationSeconds,
    locationType: validated.locationType,
    locationValue: validated.locationValue,
    isActive: validated.isActive,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadCoachId: context.fixedLeadCoachId ?? undefined,
    minCoachCount: validated.minCoachCount ?? 1,
    maxCoachCount: validated.maxCoachCount ?? undefined,
    targetCoHostCount: validated.targetCoHostCount ?? undefined,
    team: { connect: { id: teamId } },
    createdBy: { connect: { id: callerId } },
    updatedBy: { connect: { id: callerId } },
    ...context.schedulingConfig,
  };

  if (context.fixedLeadCoachId) {
    data.coaches = {
      create: {
        coachUserId: context.fixedLeadCoachId,
        coachOrder: 1,
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
    interactionType: context.interactionType,
    assignmentStrategy: context.assignmentStrategy,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadCoachId: context.fixedLeadCoachId ?? undefined,
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

  if (validated.minCoachCount !== undefined) {
    updateData.minCoachCount = validated.minCoachCount;
  }
  if (validated.maxCoachCount !== undefined) {
    updateData.maxCoachCount = validated.maxCoachCount;
  }
  if (validated.targetCoHostCount !== undefined) {
    updateData.targetCoHostCount = validated.targetCoHostCount;
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
  interactionType: sourceEvent.interactionType,
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
  fixedLeadCoachId: sourceEvent.fixedLeadCoachId ?? undefined,
  bufferAfterMinutes: sourceEvent.bufferAfterMinutes,
  minCoachCount: sourceEvent.minCoachCount,
  maxCoachCount: sourceEvent.maxCoachCount ?? undefined,
  targetCoHostCount: sourceEvent.targetCoHostCount ?? undefined,
});

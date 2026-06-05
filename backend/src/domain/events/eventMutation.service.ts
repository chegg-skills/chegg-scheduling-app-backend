import { AssignmentStrategy, Prisma, SessionLeadershipStrategy } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import {
  getActiveEventType,
  isValidSessionLeadershipStrategy,
  type CreateEventInput,
  type SafeEvent,
  type UpdateEventInput,
} from "./event.shared";
import { validateEventConfiguration } from "./eventCoach.service";
import { resolveEventSchedulingConfig } from "./eventScheduling.service";
import { CreateEventSchema, UpdateEventSchema } from "./event.schema";
import { normalizeKey } from "./event.shared";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";

export const resolveSessionTypeConfig = async (
  sessionTypeId: string | null | undefined,
): Promise<string | null> => {
  if (!sessionTypeId) return null;
  const sessionType = await prisma.sessionType.findUnique({ where: { id: sessionTypeId } });
  if (!sessionType) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Selected session type does not exist.");
  }
  if (!sessionType.isActive) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Selected session type is inactive.");
  }
  return sessionType.id;
};

type ResolvedEventMutationContext = {
  eventType: Awaited<ReturnType<typeof getActiveEventType>>;
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
    strategy =
      assignmentStrategy === AssignmentStrategy.DIRECT
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

/**
 * Ensures we have a valid eventTypeId. If the input is not a UUID,
 * it treats it as a name for a new EventType, creating it if it doesn't exist.
 */
async function ensureEventTypeId(idOrName: string, callerId: string): Promise<string> {
  // Check if it's already a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(idOrName)) {
    return idOrName;
  }

  const name = idOrName.trim();
  const key = normalizeKey(name);

  // Check for existing by key
  const existing = await prisma.eventType.findUnique({
    where: { key },
  });

  if (existing) {
    return existing.id;
  }

  // Create new
  const created = await prisma.eventType.create({
    data: {
      key,
      name,
      isActive: true,
      createdById: callerId,
      updatedById: callerId,
    },
  });

  return created.id;
}

export const resolveCreateEventContext = async (
  payload: CreateEventInput,
  callerId: string,
): Promise<ResolvedEventMutationContext> => {
  const validated = CreateEventSchema.body.parse(payload);

  const eventTypeId = await ensureEventTypeId(validated.eventTypeId, callerId);
  const eventType = await getActiveEventType(eventTypeId);
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
    eventType,
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
  callerId,
}: {
  payload: UpdateEventInput;
  existingEvent: SafeEvent;
  callerId: string;
}): Promise<ResolvedEventMutationContext> => {
  const validated = UpdateEventSchema.body.parse(payload);

  const nextEventTypeId = await ensureEventTypeId(
    validated.eventTypeId ?? existingEvent.eventTypeId,
    callerId,
  );
  const nextInteractionType = (validated.interactionType ??
    existingEvent.interactionType) as InteractionType;

  const eventType = await getActiveEventType(nextEventTypeId);
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
    eventType,
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
    eventType: { connect: { id: context.eventType.id } },
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
    maxBookingWindowDays: validated.maxBookingWindowDays ?? undefined,
    showDescription: validated.showDescription ?? false,
    deferCoachReveal: validated.deferCoachReveal ?? false,
    allowStudentCoachChoice: validated.allowStudentCoachChoice ?? false,
    timezone: validated.timezone ?? "UTC",
    team: { connect: { id: teamId } },
    group: validated.groupId ? { connect: { id: validated.groupId } } : undefined,
    sessionType: validated.sessionTypeId ? { connect: { id: validated.sessionTypeId } } : undefined,
    createdBy: { connect: { id: callerId } },
    updatedBy: { connect: { id: callerId } },
    ...context.schedulingConfig,
    allowedWeekdays: validated.weeklyAvailability
      ? Array.from(new Set(validated.weeklyAvailability.map((a) => a.dayOfWeek))).sort()
      : validated.allowedWeekdays,
    weeklyAvailability: validated.weeklyAvailability
      ? {
          createMany: {
            data: validated.weeklyAvailability,
          },
        }
      : undefined,
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

  return data as any;
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

  const { weeklyAvailability, ...schedulingConfig } = context.schedulingConfig;

  // Derive allowedWeekdays from weeklyAvailability if provided, otherwise use payload's
  const weeklyAvailabilityData = validated.weeklyAvailability;
  const derivedAllowedWeekdays = weeklyAvailabilityData
    ? Array.from(new Set(weeklyAvailabilityData.map((a) => a.dayOfWeek))).sort()
    : validated.allowedWeekdays;

  const updateData: Prisma.EventUpdateInput = {
    updatedBy: { connect: { id: callerId } },
    eventType: { connect: { id: context.eventType.id } },
    interactionType: context.interactionType,
    assignmentStrategy: context.assignmentStrategy,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadCoachId: context.fixedLeadCoachId ?? undefined,
    ...schedulingConfig,
    allowedWeekdays: derivedAllowedWeekdays,
  };

  // weeklyAvailability is handled separately in the service to allow for delete/create sync
  delete (updateData as any).weeklyAvailability;

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
  if (validated.showDescription !== undefined) {
    updateData.showDescription = validated.showDescription;
  }

  if (validated.maxBookingWindowDays !== undefined) {
    updateData.maxBookingWindowDays = validated.maxBookingWindowDays;
  }

  if (validated.deferCoachReveal !== undefined) {
    updateData.deferCoachReveal = validated.deferCoachReveal;
  }

  if (validated.allowStudentCoachChoice !== undefined) {
    updateData.allowStudentCoachChoice = validated.allowStudentCoachChoice;
  }

  if (validated.timezone !== undefined) {
    updateData.timezone = validated.timezone;
  }

  if (validated.groupId !== undefined) {
    updateData.group =
      validated.groupId === null ? { disconnect: true } : { connect: { id: validated.groupId } };
  }

  if (validated.sessionTypeId !== undefined) {
    updateData.sessionType =
      validated.sessionTypeId === null
        ? { disconnect: true }
        : { connect: { id: validated.sessionTypeId } };
  }

  return updateData as any;
};

export const buildDuplicateEventData = ({
  sourceEvent,
  callerId,
}: {
  sourceEvent: SafeEvent;
  callerId: string;
}): Prisma.EventCreateInput => {
  const { sessionLeadershipStrategy, fixedLeadCoachId } = resolveSessionLeadershipConfig({
    interactionType: sourceEvent.interactionType as InteractionType,
    existingEvent: sourceEvent,
    payload: {}, // No manual overrides during duplication
    assignmentStrategy: sourceEvent.assignmentStrategy,
  });

  return {
    name: `Copy of ${sourceEvent.name}`,
    publicBookingSlug: createPublicBookingSlug(`Copy of ${sourceEvent.name}`, "event"),
    description: sourceEvent.description ?? undefined,
    eventType: { connect: { id: sourceEvent.eventTypeId } },
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
    minimumNoticeMinutes: sourceEvent.minimumNoticeMinutes,
    minParticipantCount: sourceEvent.minParticipantCount ?? undefined,
    maxParticipantCount: sourceEvent.maxParticipantCount ?? undefined,
    sessionLeadershipStrategy,
    fixedLeadCoachId: fixedLeadCoachId ?? undefined,
    bufferAfterMinutes: sourceEvent.bufferAfterMinutes,
    minCoachCount: sourceEvent.minCoachCount,
    maxCoachCount: sourceEvent.maxCoachCount ?? undefined,
    targetCoHostCount: (sourceEvent as any).targetCoHostCount ?? undefined,
    maxBookingWindowDays: (sourceEvent as any).maxBookingWindowDays ?? undefined,
    showDescription: (sourceEvent as any).showDescription,
    deferCoachReveal: (sourceEvent as any).deferCoachReveal ?? false,
    allowStudentCoachChoice: (sourceEvent as any).allowStudentCoachChoice ?? false,
    group: sourceEvent.groupId ? { connect: { id: sourceEvent.groupId } } : undefined,
    sessionType: sourceEvent.sessionTypeId
      ? { connect: { id: sourceEvent.sessionTypeId } }
      : undefined,
    allowedWeekdays:
      sourceEvent.weeklyAvailability.length > 0
        ? Array.from(new Set(sourceEvent.weeklyAvailability.map((a) => a.dayOfWeek))).sort()
        : sourceEvent.allowedWeekdays,
    weeklyAvailability:
      sourceEvent.weeklyAvailability.length > 0
        ? {
            createMany: {
              data: sourceEvent.weeklyAvailability.map((a) => ({
                dayOfWeek: a.dayOfWeek,
                startTime: a.startTime,
                endTime: a.endTime,
              })),
            },
          }
        : undefined,
  } as any;
};

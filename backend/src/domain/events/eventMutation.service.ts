import { AssignmentStrategy, Prisma, SessionLeadershipStrategy, EventLocationType } from "@prisma/client";
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
import { normalizeKey } from "./event.shared";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { StatusCodes } from "http-status-codes";

// The resolved lead-coach configuration. Kept as its own named type (rather than Pick-ing from
// ResolvedEventMutationContext) so this building-block helper doesn't depend on the shape of the
// larger context it helps assemble.
type LeadershipConfig = {
  sessionLeadershipStrategy: SessionLeadershipStrategy;
  fixedLeadCoachId: string | null;
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
}): LeadershipConfig => {
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
  const eventTypeId = await ensureEventTypeId(payload.eventTypeId, callerId);
  const eventType = await getActiveEventType(eventTypeId);
  const interactionType = payload.interactionType as InteractionType;
  const assignmentStrategy = payload.assignmentStrategy;

  const { sessionLeadershipStrategy, fixedLeadCoachId } = resolveSessionLeadershipConfig({
    interactionType,
    payload,
    assignmentStrategy,
  });

  validateEventConfiguration({
    interactionType,
    assignmentStrategy,
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
    schedulingConfig: resolveEventSchedulingConfig(payload),
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
  const resolvedEventTypeId = payload.eventTypeId ?? existingEvent.eventTypeId;
  if (!resolvedEventTypeId) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Event type is required.");
  }
  const nextEventTypeId = await ensureEventTypeId(resolvedEventTypeId, callerId);
  const nextInteractionType = (payload.interactionType ??
    existingEvent.interactionType) as InteractionType;

  const eventType = await getActiveEventType(nextEventTypeId);
  const assignmentStrategy = payload.assignmentStrategy ?? existingEvent.assignmentStrategy;

  const { sessionLeadershipStrategy, fixedLeadCoachId } = resolveSessionLeadershipConfig({
    interactionType: nextInteractionType,
    existingEvent,
    payload,
    assignmentStrategy,
  });

  validateEventConfiguration({
    interactionType: nextInteractionType,
    assignmentStrategy,
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
    schedulingConfig: resolveEventSchedulingConfig(payload, existingEvent),
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
  // Preserve expiry fields for any VIRTUAL or CUSTOM location regardless of link source —
  // both the shared event URL and the coach-zoom fallback URL can expire.
  const hasExpiryCapableLocation =
    payload.locationType === EventLocationType.VIRTUAL ||
    payload.locationType === EventLocationType.CUSTOM;

  const data: Prisma.EventCreateInput = {
    name: payload.name,
    publicBookingSlug: createPublicBookingSlug(payload.name, "event"),
    description: payload.description ?? undefined,
    eventType: { connect: { id: context.eventType.id } },
    interactionType: context.interactionType,
    assignmentStrategy: context.assignmentStrategy,
    durationSeconds: payload.durationSeconds,
    locationType: payload.locationType,
    locationValue: payload.locationValue,
    isActive: payload.isActive,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadCoachId: context.fixedLeadCoachId ?? undefined,
    targetCoHostCount: payload.targetCoHostCount ?? undefined,
    maxBookingWindowDays: payload.maxBookingWindowDays ?? undefined,
    showDescription: payload.showDescription ?? false,
    deferCoachReveal: payload.deferCoachReveal ?? false,
    allowAnonymousBooking: payload.allowAnonymousBooking ?? false,
    allowStudentCoachChoice: payload.allowStudentCoachChoice ?? false,
    meetingLinkSource: payload.meetingLinkSource,
    locationLinkExpiresAt: hasExpiryCapableLocation ? (payload.locationLinkExpiresAt ?? null) : null,
    locationLinkReminderDays: hasExpiryCapableLocation ? (payload.locationLinkReminderDays ?? null) : null,
    customQuestions: payload.customQuestions ?? [],
    useDefaultQuestions: payload.useDefaultQuestions ?? true,
    team: { connect: { id: teamId } },
    group: payload.groupId ? { connect: { id: payload.groupId } } : undefined,
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

  const updateData: Prisma.EventUpdateInput = {
    updatedBy: { connect: { id: callerId } },
    eventType: { connect: { id: context.eventType.id } },
    interactionType: context.interactionType,
    assignmentStrategy: context.assignmentStrategy,
    sessionLeadershipStrategy: context.sessionLeadershipStrategy,
    fixedLeadCoachId: context.fixedLeadCoachId ?? undefined,
    ...context.schedulingConfig,
  };

  if (payload.name !== undefined) {
    updateData.name = payload.name;
    if (!existingEvent.publicBookingSlug) {
      updateData.publicBookingSlug = createPublicBookingSlug(payload.name, "event");
    }
  }

  if (payload.description !== undefined) {
    updateData.description = payload.description;
  }

  if (payload.durationSeconds !== undefined) {
    updateData.durationSeconds = payload.durationSeconds;
  }

  updateData.locationType = payload.locationType ?? existingEvent.locationType;
  updateData.locationValue = payload.locationValue ?? existingEvent.locationValue;

  if (payload.isActive !== undefined) {
    updateData.isActive = payload.isActive;
  }

  if (payload.targetCoHostCount !== undefined) {
    updateData.targetCoHostCount = payload.targetCoHostCount;
  }
  if (payload.showDescription !== undefined) {
    updateData.showDescription = payload.showDescription;
  }

  if (payload.maxBookingWindowDays !== undefined) {
    updateData.maxBookingWindowDays = payload.maxBookingWindowDays;
  }


  if (payload.deferCoachReveal !== undefined) {
    updateData.deferCoachReveal = payload.deferCoachReveal;
  }

  if (payload.allowAnonymousBooking !== undefined) {
    updateData.allowAnonymousBooking = payload.allowAnonymousBooking;
  }

  if (payload.allowStudentCoachChoice !== undefined) {
    updateData.allowStudentCoachChoice = payload.allowStudentCoachChoice;
  }

  if (payload.meetingLinkSource !== undefined) {
    updateData.meetingLinkSource = payload.meetingLinkSource;
  }

  const finalLocationType = payload.locationType ?? existingEvent.locationType;
  // Preserve expiry fields for any VIRTUAL or CUSTOM location regardless of link source
  const hasExpiryCapableLocation =
    finalLocationType === EventLocationType.VIRTUAL ||
    finalLocationType === EventLocationType.CUSTOM;

  if (hasExpiryCapableLocation) {
    if (payload.locationLinkExpiresAt !== undefined) {
      updateData.locationLinkExpiresAt = payload.locationLinkExpiresAt;
    }
    if (payload.locationLinkReminderDays !== undefined) {
      updateData.locationLinkReminderDays = payload.locationLinkReminderDays;
    }
  } else {
    updateData.locationLinkExpiresAt = null;
    updateData.locationLinkReminderDays = null;
  }

  if (payload.useDefaultQuestions !== undefined) {
    updateData.useDefaultQuestions = payload.useDefaultQuestions;
    // When switching back to default questions, clear any stale custom questions from the DB.
    if (payload.useDefaultQuestions === true) {
      updateData.customQuestions = [];
    }
  }

  if (payload.customQuestions !== undefined && payload.useDefaultQuestions !== true) {
    updateData.customQuestions = payload.customQuestions;
  }

  if (payload.groupId !== undefined) {
    updateData.group =
      payload.groupId === null ? { disconnect: true } : { connect: { id: payload.groupId } };
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
    eventType: sourceEvent.eventTypeId ? { connect: { id: sourceEvent.eventTypeId } } : undefined,
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
    maxParticipantCount: sourceEvent.maxParticipantCount ?? undefined,
    sessionLeadershipStrategy,
    fixedLeadCoachId: fixedLeadCoachId ?? undefined,
    bufferAfterMinutes: sourceEvent.bufferAfterMinutes,
    targetCoHostCount: (sourceEvent as any).targetCoHostCount ?? undefined,
    maxBookingWindowDays: (sourceEvent as any).maxBookingWindowDays ?? undefined,
    showDescription: (sourceEvent as any).showDescription,
    deferCoachReveal: (sourceEvent as any).deferCoachReveal ?? false,
    allowAnonymousBooking: (sourceEvent as any).allowAnonymousBooking ?? false,
    allowStudentCoachChoice: (sourceEvent as any).allowStudentCoachChoice ?? false,
    meetingLinkSource: (sourceEvent as any).meetingLinkSource ?? "COACH_ISV",
    locationLinkExpiresAt: (sourceEvent as any).locationLinkExpiresAt ?? null,
    locationLinkReminderDays: (sourceEvent as any).locationLinkReminderDays ?? null,
    customQuestions: sourceEvent.customQuestions ?? [],
    useDefaultQuestions: sourceEvent.useDefaultQuestions ?? true,
    group: sourceEvent.groupId ? { connect: { id: sourceEvent.groupId } } : undefined,
  } as any;
};

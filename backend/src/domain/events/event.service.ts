import {
  AssignmentStrategy,
  Prisma,
  SessionLeadershipStrategy,
  type EventInteractionType as EventInteractionTypeModel,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { resolvePagination } from "../../shared/utils/pagination";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import type { CallerContext } from "../../shared/utils/userUtils";
import { createPublicBookingSlug } from "../../shared/utils/publicBookingSlug";
import {
  eventInclude,
  getActiveInteractionType,
  getActiveOffering,
  getManagedEvent,
  isValidAssignmentStrategy,
  isValidLocationType,
  isValidSessionLeadershipStrategy,
  normalizeOptionalString,
  normalizeRequiredString,
  parseDurationSeconds,
  parseOptionalEnum,
  parseRequiredEnum,
  type CreateEventInput,
  type ListEventsOptions,
  type SafeEvent,
  type UpdateEventInput,
} from "./event.shared";
import {
  createInteractionType,
  createEventOffering,
  deleteInteractionType,
  getInteractionTypeUsage,
  listEventOfferings,
  listInteractionTypes,
  updateEventOffering,
  updateInteractionType,
} from "./eventCatalog.service";
import {
  listEventHosts,
  removeEventHost,
  replaceEventHosts,
  syncRoutingState,
  validateEventConfiguration,
} from "./eventHost.service";
import {
  assertBookingNoticeSatisfied,
  assertBookingWeekdayAllowed,
  assertParticipantCapacityAvailable,
  createEventScheduleSlot,
  deleteEventScheduleSlot,
  getEffectiveParticipantPolicy,
  listEventScheduleSlots,
  resolveEventSchedulingConfig,
  resolveMatchingScheduleSlot,
  updateEventScheduleSlot,
} from "./eventScheduling.service";


const buildCreateEventData = (
  payload: CreateEventInput,
  callerId: string,
  teamId: string,
  offeringId: string,
  interactionTypeId: string,
  assignmentStrategy: AssignmentStrategy,
  sessionLeadershipStrategy: SessionLeadershipStrategy,
  fixedLeadHostId: string | null,
  schedulingConfig: ReturnType<typeof resolveEventSchedulingConfig>,
): Prisma.EventCreateInput => {
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
    offering: { connect: { id: offeringId } },
    interactionType: { connect: { id: interactionTypeId } },
    assignmentStrategy,
    durationSeconds,
    locationType,
    locationValue,
    isActive: payload.isActive ?? true,
    sessionLeadershipStrategy,
    fixedLeadHostId,
    team: { connect: { id: teamId } },
    createdBy: { connect: { id: callerId } },
    updatedBy: { connect: { id: callerId } },
    ...schedulingConfig,
  };

  if (fixedLeadHostId) {
    data.hosts = {
      create: {
        hostUserId: fixedLeadHostId,
        hostOrder: 1,
        isActive: true,
      },
    };
  }

  return data;
};

const createEvent = async (
  teamId: string,
  payload: CreateEventInput,
  caller: CallerContext,
): Promise<SafeEvent> => {
  await getManagedTeam(teamId, caller);

  const offeringId = normalizeRequiredString(payload.offeringId, "offeringId");
  const interactionTypeId = normalizeRequiredString(
    payload.interactionTypeId,
    "interactionTypeId",
  );

  const offering = await getActiveOffering(offeringId);
  const interactionType = await getActiveInteractionType(interactionTypeId);

  const strategy = parseOptionalEnum(
    payload.assignmentStrategy,
    "assignmentStrategy",
    isValidAssignmentStrategy,
  ) ?? AssignmentStrategy.DIRECT;

  validateEventConfiguration(interactionType, {
    assignmentStrategy: strategy,
    hostCount: 0, // No hosts yet on create
  });

  const schedulingConfig = resolveEventSchedulingConfig(
    payload,
    interactionType,
  );

  const sessionLeadershipStrategy = parseOptionalEnum(
    payload.sessionLeadershipStrategy,
    "sessionLeadershipStrategy",
    isValidSessionLeadershipStrategy,
  ) ?? (interactionType.supportsSimultaneousCoaches ? SessionLeadershipStrategy.ROTATING_LEAD : SessionLeadershipStrategy.SINGLE_HOST);

  const fixedLeadHostId = normalizeOptionalString(payload.fixedLeadHostId, "fixedLeadHostId");

  return prisma.event.create({
    data: buildCreateEventData(
      { ...payload, assignmentStrategy: strategy },
      caller.id,
      teamId,
      offering.id,
      interactionType.id,
      strategy,
      sessionLeadershipStrategy,
      fixedLeadHostId,
      schedulingConfig,
    ),
    include: eventInclude,
  });
};

const listTeamEvents = async (
  teamId: string,
  caller: CallerContext,
  options: ListEventsOptions = {},
): Promise<{
  events: SafeEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> => {
  await getManagedTeam(teamId, caller, { allowInactive: true });

  const { page, pageSize, skip } = resolvePagination(options);

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where: { teamId },
      include: eventInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.event.count({ where: { teamId } }),
  ]);

  return {
    events,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const readEvent = async (
  eventId: string,
  caller: CallerContext,
): Promise<SafeEvent> => {
  return getManagedEvent(eventId, caller);
};

const updateEvent = async (
  eventId: string,
  payload: UpdateEventInput,
  caller: CallerContext,
): Promise<SafeEvent> => {
  const existingEvent = await getManagedEvent(eventId, caller);

  const updateData: Prisma.EventUpdateInput = {
    updatedBy: { connect: { id: caller.id } },
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

  const nextOfferingId =
    payload.offeringId !== undefined
      ? normalizeRequiredString(payload.offeringId, "offeringId")
      : existingEvent.offeringId;

  const nextInteractionTypeId =
    payload.interactionTypeId !== undefined
      ? normalizeRequiredString(payload.interactionTypeId, "interactionTypeId")
      : existingEvent.interactionTypeId;

  const offering = await getActiveOffering(nextOfferingId);
  const interactionType = await getActiveInteractionType(nextInteractionTypeId);

  updateData.offering = { connect: { id: offering.id } };
  updateData.interactionType = { connect: { id: interactionType.id } };

  if (payload.assignmentStrategy !== undefined) {
    updateData.assignmentStrategy = parseOptionalEnum(
      payload.assignmentStrategy,
      "assignmentStrategy",
      isValidAssignmentStrategy,
    );
  }

  const nextAssignmentStrategy =
    (updateData.assignmentStrategy as AssignmentStrategy | undefined) ??
    existingEvent.assignmentStrategy;

  validateEventConfiguration(interactionType, {
    assignmentStrategy: nextAssignmentStrategy,
    hostCount: existingEvent.hosts.length,
  });

  const schedulingConfig = resolveEventSchedulingConfig(
    payload,
    interactionType,
    existingEvent,
  );

  Object.assign(updateData, schedulingConfig);

  if (payload.sessionLeadershipStrategy !== undefined) {
    updateData.sessionLeadershipStrategy = parseOptionalEnum(
      payload.sessionLeadershipStrategy,
      "sessionLeadershipStrategy",
      isValidSessionLeadershipStrategy,
    );
  }

  if (payload.fixedLeadHostId !== undefined) {
    updateData.fixedLeadHostId = normalizeOptionalString(payload.fixedLeadHostId, "fixedLeadHostId");
  }

  if (payload.durationSeconds !== undefined) {
    updateData.durationSeconds = parseDurationSeconds(payload.durationSeconds);
  }

  const nextLocationType =
    payload.locationType !== undefined
      ? parseOptionalEnum(
        payload.locationType,
        "locationType",
        isValidLocationType,
      )
      : existingEvent.locationType;

  const nextLocationValue =
    payload.locationValue !== undefined
      ? normalizeRequiredString(payload.locationValue, "locationValue")
      : existingEvent.locationValue;

  if (!nextLocationValue) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "locationValue is required.",
    );
  }

  updateData.locationType = nextLocationType;
  updateData.locationValue = nextLocationValue;

  if (payload.isActive !== undefined) {
    updateData.isActive = Boolean(payload.isActive);
  }

  let updatedEvent: SafeEvent;
  try {
    updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: updateData,
      include: eventInclude,
    });
  } catch (error) {
    console.error("Failed to update event:", error);
    throw error;
  }

  if (
    updatedEvent.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    updatedEvent.hosts.length < 2
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "ROUND_ROBIN events require at least two hosts.",
    );
  }

  await prisma.$transaction(async (tx) => {
    await syncRoutingState(
      tx,
      eventId,
      updatedEvent.assignmentStrategy,
      updatedEvent.hosts.length,
    );
  });

  return prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });
};

const deleteEvent = async (
  eventId: string,
  caller: CallerContext,
): Promise<SafeEvent> => {
  const event = await getManagedEvent(eventId, caller);

  // Check for bookings
  const bookingCount = await prisma.booking.count({
    where: { eventId, status: { not: "CANCELLED" } },
  });

  if (bookingCount > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete an event that has active booking(s). Please deactivate it instead.`,
    );
  }

  return prisma.event.delete({
    where: { id: eventId },
    include: eventInclude,
  });
};


const duplicateEvent = async (
  eventId: string,
  caller: CallerContext,
): Promise<SafeEvent> => {
  const sourceEvent = await getManagedEvent(eventId, caller);

  const duplicateData: Prisma.EventCreateInput = {
    name: `Copy of ${sourceEvent.name}`,
    publicBookingSlug: createPublicBookingSlug(`Copy of ${sourceEvent.name}`, "event"),
    description: sourceEvent.description,
    offering: { connect: { id: sourceEvent.offeringId } },
    interactionType: { connect: { id: sourceEvent.interactionTypeId } },
    assignmentStrategy: sourceEvent.assignmentStrategy,
    durationSeconds: sourceEvent.durationSeconds,
    locationType: sourceEvent.locationType,
    locationValue: sourceEvent.locationValue,
    isActive: false, // Default to inactive for the copy
    team: { connect: { id: sourceEvent.teamId } },
    createdBy: { connect: { id: caller.id } },
    updatedBy: { connect: { id: caller.id } },
    bookingMode: sourceEvent.bookingMode,
    allowedWeekdays: sourceEvent.allowedWeekdays,
    minimumNoticeMinutes: sourceEvent.minimumNoticeMinutes,
    minParticipantCount: sourceEvent.minParticipantCount,
    maxParticipantCount: sourceEvent.maxParticipantCount,
    sessionLeadershipStrategy: sourceEvent.sessionLeadershipStrategy,
    fixedLeadHostId: sourceEvent.fixedLeadHostId,
  };

  return prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: duplicateData,
      include: eventInclude,
    });

    // Duplicate hosts
    if (sourceEvent.hosts.length > 0) {
      await tx.eventHost.createMany({
        data: sourceEvent.hosts.map((host) => ({
          eventId: newEvent.id,
          hostUserId: host.hostUserId,
          hostOrder: host.hostOrder,
          isActive: host.isActive,
        })),
      });
    }

    // Initialize routing state if needed
    await syncRoutingState(
      tx,
      newEvent.id,
      newEvent.assignmentStrategy,
      sourceEvent.hosts.length,
    );

    return tx.event.findUniqueOrThrow({
      where: { id: newEvent.id },
      include: eventInclude,
    });
  });
};

const listAllEvents = async (
  _caller: CallerContext,
  options: ListEventsOptions = {},
): Promise<{
  events: SafeEvent[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> => {
  const { page, pageSize, skip } = resolvePagination(options);

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      include: eventInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.event.count(),
  ]);

  return {
    events,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

export {
  createEventOffering,
  listEventOfferings,
  updateEventOffering,
  createInteractionType,
  listInteractionTypes,
  updateInteractionType,
  deleteInteractionType,
  getInteractionTypeUsage,
  createEvent,
  duplicateEvent,
  deleteEvent,
  listEventHosts,
  listTeamEvents,
  listAllEvents,
  readEvent,
  removeEventHost,
  replaceEventHosts,
  updateEvent,
  listEventScheduleSlots,
  createEventScheduleSlot,
  updateEventScheduleSlot,
  deleteEventScheduleSlot,
  assertBookingNoticeSatisfied,
  assertBookingWeekdayAllowed,
  getEffectiveParticipantPolicy,
  assertParticipantCapacityAvailable,
  resolveMatchingScheduleSlot,
  type SafeEvent,
};

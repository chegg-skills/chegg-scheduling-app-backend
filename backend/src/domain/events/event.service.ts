import {
  AssignmentStrategy,
  Prisma,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { resolvePagination } from "../../shared/utils/pagination";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  eventInclude,
  getManagedEvent,
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
  deleteEventOffering,
  getEventOfferingUsage,
  updateInteractionType,
} from "./eventCatalog.service";
import {
  listEventHosts,
  removeEventHost,
  replaceEventHosts,
  syncRoutingState,
} from "./eventHost.service";
import {
  assertBookingNoticeSatisfied,
  assertBookingWeekdayAllowed,
  assertParticipantCapacityAvailable,
  createEventScheduleSlot,
  deleteEventScheduleSlot,
  getEffectiveParticipantPolicy,
  listEventScheduleSlots,
  resolveMatchingScheduleSlot,
  updateEventScheduleSlot,
} from "./eventScheduling.service";
import {
  buildDuplicateEventData,
  buildEventCreateData,
  buildEventUpdateData,
  resolveCreateEventContext,
  resolveUpdateEventContext,
} from "./eventMutation.service";

const listEventsByQuery = async (
  where: Prisma.EventWhereInput,
  options: ListEventsOptions = {},
) => {
  const { page, pageSize, skip } = resolvePagination(options);

  const [events, total] = await prisma.$transaction([
    prisma.event.findMany({
      where,
      include: eventInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.event.count({ where }),
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

const assertRoundRobinHostCount = (event: SafeEvent): void => {
  if (
    event.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    event.hosts.length < 2
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "ROUND_ROBIN events require at least two hosts.",
    );
  }
};

const createEvent = async (
  teamId: string,
  payload: CreateEventInput,
  caller: CallerContext,
): Promise<SafeEvent> => {
  await getManagedTeam(teamId, caller);

  const context = await resolveCreateEventContext(payload);

  return prisma.event.create({
    data: buildEventCreateData({
      payload,
      callerId: caller.id,
      teamId,
      context,
    }),
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

  return listEventsByQuery({ teamId }, options);
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
  const context = await resolveUpdateEventContext({ payload, existingEvent });

  let updatedEvent: SafeEvent;
  try {
    updatedEvent = await prisma.event.update({
      where: { id: eventId },
      data: buildEventUpdateData({
        payload,
        existingEvent,
        callerId: caller.id,
        context,
      }),
      include: eventInclude,
    });
  } catch (error) {
    console.error("Failed to update event:", error);
    throw error;
  }

  assertRoundRobinHostCount(updatedEvent);

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

  return prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: buildDuplicateEventData({
        sourceEvent,
        callerId: caller.id,
      }),
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
  return listEventsByQuery({}, options);
};

export {
  createEventOffering,
  listEventOfferings,
  updateEventOffering,
  deleteEventOffering,
  getEventOfferingUsage,
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

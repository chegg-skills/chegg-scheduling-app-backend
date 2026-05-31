import { AssignmentStrategy, Prisma, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { resolvePagination } from "../../shared/utils/pagination";
import { getManagedTeam } from "../../shared/utils/teamAccess";
import type { CallerContext } from "../../shared/utils/userUtils";
import { getRequestLogger } from "../../shared/logging/requestContext";
import {
  assertGroupBelongsToTeam,
  eventInclude,
  getManagedEvent,
  type CreateEventInput,
  type ListEventsOptions,
  type SafeEvent,
  type UpdateEventInput,
} from "./event.shared";
import { UpdateEventSchema } from "./event.schema";
import {
  createEventType,
  listEventTypes,
  listInteractionTypes,
  updateEventType,
  deleteEventType,
  getEventTypeUsage,
} from "./eventCatalog.service";
import {
  listEventCoaches,
  removeEventCoach,
  replaceEventCoaches,
  syncRoutingState,
} from "./eventCoach.service";
import {
  assertBookingNoticeSatisfied,
  assertBookingAvailabilityAllowed,
  assertParticipantCapacityAvailable,
  createEventScheduleSlot,
  deleteEventScheduleSlot,
  getEffectiveParticipantPolicy,
  listEventScheduleSlots,
  listSlotBookings,
  resolveMatchingScheduleSlot,
  updateEventScheduleSlot,
  cancelEventScheduleSlot,
  revealCoachForSlot,
  getCoachAvailabilityForSlot,
} from "./eventScheduling.service";
import {
  buildDuplicateEventData,
  buildEventCreateData,
  buildEventUpdateData,
  resolveCreateEventContext,
  resolveUpdateEventContext,
} from "./eventMutation.service";
import { queueEventStatusChangedNotification } from "./event.notification";

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

const assertRoundRobinCoachCount = (event: SafeEvent): void => {
  // 0 coaches is allowed during initial event setup (consistent with validateEventConfiguration's
  // `coachCount > 0` guard). Only the 1-coach intermediate state is invalid for ROUND_ROBIN.
  if (
    event.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    event.coaches.length > 0 &&
    event.coaches.length < 2
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "ROUND_ROBIN events require at least two coaches.",
    );
  }
};

const createEvent = async (
  teamId: string,
  payload: CreateEventInput,
  caller: CallerContext,
): Promise<SafeEvent> => {
  await getManagedTeam(teamId, caller);

  if (payload.groupId) {
    await assertGroupBelongsToTeam(payload.groupId, teamId);
  }

  const context = await resolveCreateEventContext(payload, caller.id);

  const event = await prisma.event.create({
    data: buildEventCreateData({ payload, callerId: caller.id, teamId, context }),
    include: eventInclude,
  });

  getRequestLogger().info({ eventId: event.id, teamId, interactionType: event.interactionType, createdBy: caller.id }, "Event created.");

  return event;
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
  await getManagedTeam(teamId, caller, { allowCoachMember: true, allowInactive: true });

  const whereClause: Prisma.EventWhereInput = { teamId };
  if (caller.role === UserRole.COACH) {
    whereClause.coaches = { some: { coachUserId: caller.id, isActive: true } };
  }

  return listEventsByQuery(whereClause, options);
};

const readEvent = async (eventId: string, caller: CallerContext): Promise<SafeEvent> => {
  return getManagedEvent(eventId, caller, { allowCoachMember: true });
};

const updateEvent = async (
  eventId: string,
  payload: UpdateEventInput,
  caller: CallerContext,
): Promise<SafeEvent> => {
  const existingEvent = await getManagedEvent(eventId, caller);

  if (
    payload.deferCoachReveal !== undefined &&
    payload.deferCoachReveal !== existingEvent.deferCoachReveal &&
    existingEvent._count.bookings > 0
  ) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Deferred coach reveal cannot be changed after students have booked sessions for this event.",
    );
  }

  if (payload.groupId) {
    await assertGroupBelongsToTeam(payload.groupId, existingEvent.teamId);
  }

  const context = await resolveUpdateEventContext({ payload, existingEvent, callerId: caller.id });

  let updatedEvent: SafeEvent;
  try {
    const validated = UpdateEventSchema.body.parse(payload);
    updatedEvent = await prisma.$transaction(async (tx) => {
      if (validated.weeklyAvailability) {
        await tx.eventWeeklyAvailability.deleteMany({ where: { eventId } });
        await tx.eventWeeklyAvailability.createMany({
          data: validated.weeklyAvailability.map((a) => ({ ...a, eventId })),
        });
      }

      return tx.event.update({
        where: { id: eventId },
        data: buildEventUpdateData({
          payload,
          existingEvent,
          callerId: caller.id,
          context,
        }),
        include: eventInclude,
      });
    });
  } catch (error) {
    getRequestLogger().error({ eventId, error }, "Event update transaction failed.");
    throw error;
  }

  assertRoundRobinCoachCount(updatedEvent);

  await prisma.$transaction(async (tx) => {
    await syncRoutingState(
      tx,
      eventId,
      updatedEvent.assignmentStrategy,
      updatedEvent.coaches.length,
    );
  });

  if (payload.isActive !== undefined && payload.isActive !== existingEvent.isActive) {
    getRequestLogger().info({ eventId, isActive: updatedEvent.isActive, updatedBy: caller.id }, "Event active status changed.");
    void queueEventStatusChangedNotification({
      eventId,
      eventName: updatedEvent.name,
      isActive: updatedEvent.isActive,
      callerId: caller.id,
    });
  } else {
    getRequestLogger().info({ eventId, updatedBy: caller.id }, "Event updated.");
  }

  return prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: eventInclude,
  });
};

const deleteEvent = async (eventId: string, caller: CallerContext): Promise<SafeEvent> => {
  const event = await getManagedEvent(eventId, caller);

  const bookingCount = await prisma.booking.count({
    where: { eventId, status: { not: "CANCELLED" } },
  });

  if (bookingCount > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      `Cannot delete an event that has active booking(s). Please deactivate it instead.`,
    );
  }

  getRequestLogger().warn({ eventId, teamId: event.teamId, deletedBy: caller.id }, "Event deleted.");

  // Manually cleanup relations that don't have cascade delete in the schema
  await prisma.$transaction(async (tx) => {
    // 1. Delete all bookings (including cancelled ones)
    await tx.booking.deleteMany({
      where: { eventId },
    });

    // 2. Delete all schedule slots
    await tx.eventScheduleSlot.deleteMany({
      where: { eventId },
    });

    // 3. Delete the event (this will cascade to EventCoach and EventRoutingState)
    await tx.event.delete({
      where: { id: eventId },
    });
  });

  return event;
};

const duplicateEvent = async (eventId: string, caller: CallerContext): Promise<SafeEvent> => {
  const sourceEvent = await getManagedEvent(eventId, caller);

  return prisma.$transaction(async (tx) => {
    const newEvent = await tx.event.create({
      data: buildDuplicateEventData({
        sourceEvent,
        callerId: caller.id,
      }),
      include: eventInclude,
    });

    // Duplicate coaches
    if (sourceEvent.coaches.length > 0) {
      await tx.eventCoach.createMany({
        data: sourceEvent.coaches.map((coach) => ({
          eventId: newEvent.id,
          coachUserId: coach.coachUserId,
          coachOrder: coach.coachOrder,
          isActive: coach.isActive,
        })),
      });
    }

    // Initialize routing state if needed
    await syncRoutingState(
      tx,
      newEvent.id,
      newEvent.assignmentStrategy,
      sourceEvent.coaches.length,
    );

    const duplicated = await tx.event.findUniqueOrThrow({
      where: { id: newEvent.id },
      include: eventInclude,
    });

    getRequestLogger().info({ sourceEventId: eventId, newEventId: newEvent.id, coachCount: sourceEvent.coaches.length, duplicatedBy: caller.id }, "Event duplicated.");

    return duplicated;
  });
};

const listAllEvents = async (
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
  const where: Prisma.EventWhereInput = {};
  if (caller.role === UserRole.COACH) {
    where.coaches = { some: { coachUserId: caller.id, isActive: true } };
  }
  return listEventsByQuery(where, options);
};

export {
  createEventType,
  listEventTypes,
  updateEventType,
  deleteEventType,
  getEventTypeUsage,
  listInteractionTypes,
  createEvent,
  duplicateEvent,
  deleteEvent,
  listEventCoaches,
  listTeamEvents,
  listAllEvents,
  readEvent,
  removeEventCoach,
  replaceEventCoaches,
  updateEvent,
  listEventScheduleSlots,
  createEventScheduleSlot,
  updateEventScheduleSlot,
  deleteEventScheduleSlot,
  listSlotBookings,
  assertBookingNoticeSatisfied,
  assertBookingAvailabilityAllowed,
  getEffectiveParticipantPolicy,
  assertParticipantCapacityAvailable,
  resolveMatchingScheduleSlot,
  cancelEventScheduleSlot,
  revealCoachForSlot,
  getCoachAvailabilityForSlot,
  type SafeEvent,
};

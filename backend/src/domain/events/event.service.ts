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
  getEventCoachAvailability,
  setEventCoachAvailability,
} from "./eventCoach.service";
import {
  assertBookingNoticeSatisfied,
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
  stopRecurrenceGroup,
  resumeRecurrenceGroup,
} from "./eventScheduling.service";
import {
  buildDuplicateEventData,
  buildEventCreateData,
  buildEventUpdateData,
  resolveCreateEventContext,
  resolveUpdateEventContext,
} from "./eventMutation.service";
import {
  queueEventStatusChangedNotification,
  queueEventLinkExpiryReminder,
  cancelEventLinkExpiryReminder,
} from "./event.notification";

const listEventsByQuery = async (
  where: Prisma.EventWhereInput,
  options: ListEventsOptions = {},
) => {
  const { page, pageSize, skip } = resolvePagination(options, { maxPageSize: 1000 });

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

  void queueEventLinkExpiryReminder(event);

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

  const whereClause: Prisma.EventWhereInput = { teamId, deletedAt: null };
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

  if (
    payload.allowAnonymousBooking !== undefined &&
    payload.allowAnonymousBooking !== existingEvent.allowAnonymousBooking &&
    existingEvent._count.bookings > 0
  ) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Anonymous booking cannot be changed after students have booked sessions for this event.",
    );
  }

  if (payload.groupId) {
    await assertGroupBelongsToTeam(payload.groupId, existingEvent.teamId);
  }

  const context = await resolveUpdateEventContext({ payload, existingEvent, callerId: caller.id });

  let updatedEvent: SafeEvent;
  try {
    updatedEvent = await prisma.$transaction(async (tx) => {
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

  const finalUpdatedEvent = await prisma.event.findUniqueOrThrow({ 
    where: { id: eventId },
    include: eventInclude,
  });

  void queueEventLinkExpiryReminder(finalUpdatedEvent);

  return finalUpdatedEvent;
};

const deleteEvent = async (eventId: string, caller: CallerContext): Promise<SafeEvent> => {
  const event = await getManagedEvent(eventId, caller);

  getRequestLogger().warn({ eventId, teamId: event.teamId, deletedBy: caller.id }, "Event deleted.");

  // Cancel any scheduled link-expiry reminder before the event is soft-deleted.
  void cancelEventLinkExpiryReminder(eventId);

  // Soft-delete the event to preserve all booking history.
  // Cascades don't fire on update, so child records must be explicitly cleaned up first.
  await prisma.$transaction(async (tx) => {
    // 1. Remove coach assignments
    await tx.eventCoach.deleteMany({ where: { eventId } });

    // 2. Delete schedule slots (SessionLog + SessionAttendance cascade from slots)
    await tx.eventScheduleSlot.deleteMany({ where: { eventId } });

    // 3. Clean up recurrence groups and routing state
    await tx.recurrenceGroup.deleteMany({ where: { eventId } });
    await tx.eventRoutingState.deleteMany({ where: { eventId } });

    // 4. Soft-delete the event — bookings are intentionally preserved
    await tx.event.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), isActive: false },
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
  const where: Prisma.EventWhereInput = { deletedAt: null };
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
  getEffectiveParticipantPolicy,
  assertParticipantCapacityAvailable,
  resolveMatchingScheduleSlot,
  cancelEventScheduleSlot,
  revealCoachForSlot,
  getCoachAvailabilityForSlot,
  stopRecurrenceGroup,
  resumeRecurrenceGroup,
  getEventCoachAvailability,
  setEventCoachAvailability,
  type SafeEvent,
};

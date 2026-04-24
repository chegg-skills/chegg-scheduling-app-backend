import { BookingStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { logger } from "../../shared/logging/logger";
import {
  assertBookingNoticeSatisfied,
  assertBookingAvailabilityAllowed,
  assertParticipantCapacityAvailable,
  getEffectiveParticipantPolicy,
  resolveMatchingScheduleSlot,
} from "../events/eventScheduling.service";
import {
  countBookings,
  countActiveParticipantsForTime,
  createBookingRecord,
  findBookableEvent,
  findBookingById,
  findBookingByToken,
  findBookings,
  updateBookingById,
  upsertStudentForBooking,
  lockScheduleSlot,
  lockEvent,
  lockCoach,
} from "./booking.repository";
import {
  buildSchedulingContext,
  normalizeStudentEmailAddress,
  normalizeStudentName,
  parseBookingStartTime,
  type BookableEvent,
  type CreateBookingInput,
  type ListBookingsFilters,
  type SafeBooking,
} from "./booking.shared";
import { resolveBookingCoachSelection } from "./bookingAssignmentResolver.service";
import type { CoachCandidate } from "./assignment.service";

export { bookingInclude, type SafeBooking } from "./booking.shared";

export type { UpdateBookingStatusInput } from "./booking.shared";

const getBookableEvent = async (teamId: string, eventId: string): Promise<BookableEvent> => {
  const event = await findBookableEvent(eventId);

  if (!event || !event.isActive) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found or inactive.");
  }

  if (event.teamId !== teamId) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Event does not belong to the specified team.");
  }

  return event;
};

const resolveBookingWindow = (event: BookableEvent, start: Date) => {
  const end = new Date(start.getTime() + event.durationSeconds * 1000);
  const schedulingContext = buildSchedulingContext(event);

  assertBookingAvailabilityAllowed(
    schedulingContext.allowedWeekdays,
    schedulingContext.weeklyAvailability as any,
    start,
    end,
  );
  assertBookingNoticeSatisfied(schedulingContext.minimumNoticeMinutes, start);

  return { end, schedulingContext };
};

const resolveSlotContext = async (event: BookableEvent, start: Date) => {
  const matchedScheduleSlot = await resolveMatchingScheduleSlot(event.id, start);
  const allowSharedSessionOverlap = event.bookingMode === "FIXED_SLOTS";

  if (allowSharedSessionOverlap && !matchedScheduleSlot) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "The requested time does not match any predefined slot for this event.",
    );
  }

  return { matchedScheduleSlot, allowSharedSessionOverlap };
};

const createBooking = async (payload: CreateBookingInput): Promise<SafeBooking> => {
  if (!payload) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Booking request body is missing.");
  }
  const {
    teamId,
    eventId,
    startTime,
    studentName,
    studentEmail,
    timezone,
    notes,
    specificQuestion,
    triedSolutions,
    usedResources,
    sessionObjectives,
    preferredCoachId,
  } = payload;

  const normalizedStudentName = normalizeStudentName(studentName);
  const normalizedStudentEmail = normalizeStudentEmailAddress(studentEmail);

  const start = parseBookingStartTime(startTime);
  const event = await getBookableEvent(teamId, eventId);
  const { end, schedulingContext } = resolveBookingWindow(event, start);
  const { matchedScheduleSlot, allowSharedSessionOverlap } = await resolveSlotContext(event, start);
  const activeCoaches = event.coaches as CoachCandidate[];

  if (activeCoaches.length === 0) {
    logger.warn("Booking blocked because no active coaches are available for the event.", {
      eventId,
      teamId,
    });
    throw new ErrorHandler(
      StatusCodes.SERVICE_UNAVAILABLE,
      "No active coaches available for this event.",
    );
  }

  // 3. Create Booking (Assignment happens inside transaction for concurrency safety)
  const booking = await prisma.$transaction(async (tx) => {
    // PESSIMISTIC LOCK: Serialize access to this slot or event's capacity
    if (matchedScheduleSlot) {
      await lockScheduleSlot(tx, matchedScheduleSlot.id);
    } else {
      await lockEvent(tx, eventId);
    }

    const { assignedCoachId, meetingJoinUrl, coCoachUserIds } = await resolveBookingCoachSelection({
      preferredCoachId,
      activeCoaches,
      event,
      start,
      end,
      allowSharedSessionOverlap,
      matchedScheduleSlotId: matchedScheduleSlot?.id,
      tx,
    });

    // LOCK HOST: Prevent another concurrent transaction from assigning this coach for an overlapping session
    await lockCoach(tx, assignedCoachId);

    const scheduleSlot =
      matchedScheduleSlot ?? (await resolveMatchingScheduleSlot(event.id, start, tx));

    const { maxParticipants } = getEffectiveParticipantPolicy(schedulingContext, scheduleSlot);

    const currentParticipantCount = await countActiveParticipantsForTime(tx, eventId, start);

    assertParticipantCapacityAvailable(maxParticipants, currentParticipantCount);

    const student = await upsertStudentForBooking(
      tx,
      normalizedStudentName,
      normalizedStudentEmail,
      start,
    );

    return createBookingRecord(tx, {
      studentId: student.id,
      scheduleSlotId: scheduleSlot?.id ?? null,
      studentName: normalizedStudentName,
      studentEmail: normalizedStudentEmail,
      teamId,
      eventId,
      coachUserId: assignedCoachId,
      coCoachUserIds,
      startTime: start,
      endTime: end,
      timezone: timezone || "UTC",
      notes,
      specificQuestion,
      triedSolutions,
      usedResources,
      sessionObjectives,
      meetingJoinUrl,
      status: BookingStatus.CONFIRMED,
    });
  }, { timeout: 15000 });

  logger.info("Booking created successfully.", {
    bookingId: booking.id,
    eventId: booking.eventId,
    teamId: booking.teamId,
    coachUserId: booking.coachUserId,
    status: booking.status,
  });

  return booking;
};
const getBooking = async (id: string) => {
  return findBookingById(id);
};

const listBookings = async (filters: ListBookingsFilters) => {
  const [bookings, totalCount] = await Promise.all([findBookings(filters), countBookings(filters)]);
  return { bookings, totalCount };
};

const updateBooking = async (
  id: string,
  data: { status?: BookingStatus; coCoachUserIds?: string[] },
) => {
  return updateBookingById(id, data);
};

const rescheduleBooking = async (
  id: string,
  payload: { startTime: string | Date; timezone?: string; token?: string },
): Promise<SafeBooking> => {
  const { startTime, timezone, token } = payload;
  const start = parseBookingStartTime(startTime);

  // 1. Find booking (verify token if provided)
  const booking = token ? await findBookingByToken(id, token) : await findBookingById(id);

  // 2. Resolve booking window and slot context
  const event = await getBookableEvent(booking.teamId, booking.eventId);
  const { end } = resolveBookingWindow(event, start);
  const { matchedScheduleSlot, allowSharedSessionOverlap } = await resolveSlotContext(event, start);

  const activeCoaches = event.coaches as CoachCandidate[];

  // 3. Re-assign host (prefer current host if available)
  const updatedBooking = await prisma.$transaction(async (tx) => {
    // PESSIMISTIC LOCK: Serialize access to this slot or event's capacity
    if (matchedScheduleSlot) {
      await lockScheduleSlot(tx, matchedScheduleSlot.id);
    } else {
      await lockEvent(tx, event.id);
    }

    const { assignedCoachId, meetingJoinUrl, coCoachUserIds } = await resolveBookingCoachSelection({
      preferredCoachId: booking.coachUserId,
      activeCoaches,
      event,
      start,
      end,
      allowSharedSessionOverlap,
      matchedScheduleSlotId: matchedScheduleSlot?.id,
      tx,
    });

    // LOCK HOST: Prevent another concurrent transaction from assigning this coach for an overlapping session
    await lockCoach(tx, assignedCoachId);

    const scheduleSlot =
      matchedScheduleSlot ?? (await resolveMatchingScheduleSlot(event.id, start, tx));

    // Check capacity for the NEW time
    const schedulingContext = buildSchedulingContext(event);
    const { maxParticipants } = getEffectiveParticipantPolicy(schedulingContext, scheduleSlot);

    const currentParticipantCount = await countActiveParticipantsForTime(
      tx,
      booking.eventId,
      start,
    );

    // When rescheduling, the student is ALREADY counted if they are moving within the same slot
    // but since we are changing the start time, we just check the new start time's capacity.
    assertParticipantCapacityAvailable(maxParticipants, currentParticipantCount);

    return updateBookingById(id, {
      startTime: start,
      endTime: end,
      timezone: timezone || booking.timezone,
      coachUserId: assignedCoachId,
      coCoachUserIds,
      meetingJoinUrl,
      scheduleSlotId: scheduleSlot?.id ?? null,
      status: BookingStatus.CONFIRMED, // Reset to confirmed if it was something else
    });
  }, { timeout: 15000 });

  logger.info("Booking rescheduled successfully.", {
    bookingId: updatedBooking.id,
    eventId: updatedBooking.eventId,
    teamId: updatedBooking.teamId,
    coachUserId: updatedBooking.coachUserId,
    startTime: updatedBooking.startTime,
  });

  return updatedBooking;
};
export { createBooking, getBooking, listBookings, updateBooking, rescheduleBooking };

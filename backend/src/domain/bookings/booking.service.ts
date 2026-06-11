import { BookingStatus, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { randomUUID } from "crypto";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { getRequestLogger } from "../../shared/logging/requestContext";
import {
  assertBookingNoticeSatisfied,
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
  findBookingDetailById,
  findBookingByToken,
  findBookings,
  updateBookingById,
  upsertStudentForBooking,
  lockScheduleSlot,
  lockEvent,
  lockCoach,
} from "./booking.repository";
import {
  assertCancelTokenValid,
  assertRescheduleTokenValid,
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
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  queueBookingCreatedNotifications,
  queueBookingStatusNotifications,
  queueBookingUpdatedNotifications,
} from "./booking.notification";

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
    getRequestLogger().warn(
      { eventId, teamId },
      "Booking blocked because no active coaches are available for the event.",
    );
    throw new ErrorHandler(
      StatusCodes.SERVICE_UNAVAILABLE,
      "No active coaches available for this event.",
    );
  }

  if (event.allowStudentCoachChoice && !preferredCoachId) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "A coach must be selected to book this session.",
    );
  }

  // 3. Create Booking (Assignment happens inside transaction for concurrency safety)
  const booking = await prisma.$transaction(
    async (tx) => {
      // PESSIMISTIC LOCK: Serialize access to this slot or event's capacity
      if (matchedScheduleSlot) {
        await lockScheduleSlot(tx, matchedScheduleSlot.id);
      } else {
        await lockEvent(tx, eventId);
      }

      const { assignedCoachId, meetingJoinUrl, coCoachUserIds } =
        await resolveBookingCoachSelection({
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
      if (assignedCoachId !== null) {
        await lockCoach(tx, assignedCoachId);
      }

      const scheduleSlot =
        matchedScheduleSlot ?? (await resolveMatchingScheduleSlot(event.id, start, tx));

      // Participant capacity is only meaningful for FIXED_SLOTS — those are pre-created shared
      // slots with a real seat cap. In COACH_AVAILABILITY mode each booking gets its own coach;
      // the coach conflict detection above already prevents double-booking at the coach level.
      if (schedulingContext.bookingMode === "FIXED_SLOTS") {
        const { maxParticipants } = getEffectiveParticipantPolicy(schedulingContext, scheduleSlot);
        const currentParticipantCount = await countActiveParticipantsForTime(tx, eventId, start);
        assertParticipantCapacityAvailable(maxParticipants, currentParticipantCount);
      }

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
    },
    { timeout: 15000 },
  );

  getRequestLogger().info(
    {
      bookingId: booking.id,
      eventId: booking.eventId,
      teamId: booking.teamId,
      coachUserId: booking.coachUserId,
      status: booking.status,
    },
    "Booking created.",
  );

  const slotRevealedAt = await (async () => {
    if (booking.event?.deferCoachReveal && booking.scheduleSlotId) {
      const slot = await prisma.eventScheduleSlot.findUnique({
        where: { id: booking.scheduleSlotId },
        select: { coachRevealSentAt: true },
      });
      return slot?.coachRevealSentAt ?? null;
    }
    return null;
  })();

  void queueBookingCreatedNotifications(booking, { slotRevealedAt });

  return booking;
};
const getBooking = async (id: string) => {
  return findBookingDetailById(id);
};

const listBookings = async (filters: ListBookingsFilters) => {
  const [bookings, totalCount] = await Promise.all([findBookings(filters), countBookings(filters)]);
  return { bookings, totalCount };
};

const updateBooking = async (
  id: string,
  data: { status?: BookingStatus; coCoachUserIds?: string[]; cancellationReason?: string },
): Promise<SafeBooking> => {
  const oldBooking = await findBookingById(id);
  const booking = await updateBookingById(id, data);

  if (data.status && data.status !== oldBooking.status) {
    getRequestLogger().info(
      { bookingId: booking.id, previousStatus: oldBooking.status, newStatus: booking.status },
      "Booking status updated.",
    );
    void queueBookingStatusNotifications(booking);
  }
  void queueBookingUpdatedNotifications(oldBooking, booking);

  return booking;
};

const rescheduleBooking = async (
  id: string,
  payload: { startTime: string | Date; timezone?: string; token?: string },
): Promise<SafeBooking> => {
  const { startTime, timezone, token } = payload;
  const start = parseBookingStartTime(startTime);

  // 1. Find booking (verify token if provided)
  const booking = token ? await findBookingByToken(id, token) : await findBookingById(id);

  if (token) assertRescheduleTokenValid(booking);

  // 2. Resolve booking window and slot context
  const event = await getBookableEvent(booking.teamId, booking.eventId);
  const { end } = resolveBookingWindow(event, start);
  const { matchedScheduleSlot, allowSharedSessionOverlap } = await resolveSlotContext(event, start);

  const activeCoaches = event.coaches as CoachCandidate[];

  // 3. Re-assign host (prefer current host if available)
  const updatedBooking = await prisma.$transaction(
    async (tx) => {
      // PESSIMISTIC LOCK: Serialize access to this slot or event's capacity
      if (matchedScheduleSlot) {
        await lockScheduleSlot(tx, matchedScheduleSlot.id);
      } else {
        await lockEvent(tx, event.id);
      }

      const { assignedCoachId, meetingJoinUrl, coCoachUserIds } =
        await resolveBookingCoachSelection({
          preferredCoachId: booking.coachUserId ?? undefined,
          activeCoaches,
          event,
          start,
          end,
          allowSharedSessionOverlap,
          matchedScheduleSlotId: matchedScheduleSlot?.id,
          tx,
        });

      // LOCK HOST: Prevent another concurrent transaction from assigning this coach for an overlapping session
      if (assignedCoachId !== null) {
        await lockCoach(tx, assignedCoachId);
      }

      const scheduleSlot =
        matchedScheduleSlot ?? (await resolveMatchingScheduleSlot(event.id, start, tx));

      // Check capacity for the NEW time (FIXED_SLOTS only — see booking creation comment)
      const schedulingContext = buildSchedulingContext(event);
      if (schedulingContext.bookingMode === "FIXED_SLOTS") {
        const { maxParticipants } = getEffectiveParticipantPolicy(schedulingContext, scheduleSlot);
        const currentParticipantCount = await countActiveParticipantsForTime(
          tx,
          booking.eventId,
          start,
        );
        assertParticipantCapacityAvailable(maxParticipants, currentParticipantCount);
      }

      return updateBookingById(id, {
        startTime: start,
        endTime: end,
        timezone: timezone || booking.timezone,
        coachUserId: assignedCoachId,
        coCoachUserIds,
        meetingJoinUrl,
        scheduleSlotId: scheduleSlot?.id ?? null,
        status: BookingStatus.CONFIRMED,
        ...(token && { rescheduleToken: randomUUID() }), // rotate token to invalidate the old link
      }, tx);
    },
    // Reschedule re-evaluates coach availability via sequential per-coach DB queries, which takes
    // longer than the initial booking creation path. 30s gives enough headroom without risking
    // indefinite deadlock holds.
    { timeout: 30000 },
  );

  getRequestLogger().info(
    {
      bookingId: updatedBooking.id,
      eventId: updatedBooking.eventId,
      teamId: updatedBooking.teamId,
      coachUserId: updatedBooking.coachUserId,
      startTime: updatedBooking.startTime,
    },
    "Booking rescheduled.",
  );

  void queueBookingUpdatedNotifications(updatedBooking, updatedBooking);

  return updatedBooking;
};
const cancelBooking = async (
  id: string,
  payload: { token?: string; cancellationReason?: string },
  caller?: CallerContext,
): Promise<SafeBooking> => {
  const { token, cancellationReason } = payload;

  const updatedBooking = await prisma.$transaction(
    async (tx) => {
      const booking = token ? await findBookingByToken(id, token, tx) : await findBookingById(id, tx);

      if (token) {
        assertCancelTokenValid(booking);
      } else {
        // Authenticated path — COACH may only cancel their own sessions
        if (caller?.role === UserRole.COACH) {
          const isLead = booking.coachUserId != null && booking.coachUserId === caller.id;
          const isCoHost = (booking.coCoachUserIds ?? []).includes(caller.id);
          if (!isLead && !isCoHost) {
            throw new ErrorHandler(
              StatusCodes.FORBIDDEN,
              "You are not authorized to cancel this booking.",
            );
          }
        }
      }

      return updateBookingById(id, {
        status: BookingStatus.CANCELLED,
        cancellationReason: cancellationReason?.trim() || null,
        // rescheduleToken is NOT rotated — assertCancelTokenValid blocks reuse via status check
      }, tx);
    },
    { timeout: 15000 },
  );

  getRequestLogger().info(
    {
      bookingId: updatedBooking.id,
      eventId: updatedBooking.eventId,
      teamId: updatedBooking.teamId,
    },
    "Booking cancelled.",
  );

  const slotRevealedAt = await (async () => {
    if (updatedBooking.event?.deferCoachReveal && updatedBooking.scheduleSlotId) {
      const slot = await prisma.eventScheduleSlot.findUnique({
        where: { id: updatedBooking.scheduleSlotId },
        select: { coachRevealSentAt: true },
      });
      return slot?.coachRevealSentAt ?? null;
    }
    return null;
  })();

  void queueBookingStatusNotifications(updatedBooking, { slotRevealedAt });

  return updatedBooking;
};

const bookFollowUpSession = async (
  bookingId: string,
  payload: {
    startTime: string | Date;
    timezone?: string;
    notes?: string;
    specificQuestion?: string;
    triedSolutions?: string;
    usedResources?: string;
    sessionObjectives?: string;
  },
  caller: CallerContext,
): Promise<SafeBooking> => {
  // 1. Fetch original booking details
  const originalBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      student: true,
      team: true,
      event: {
        include: {
          coaches: {
            where: { isActive: true },
          },
        },
      },
      coach: true,
    },
  });

  if (!originalBooking) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Original booking not found.");
  }

  // 2. Enforce Completed Booking constraint
  if (originalBooking.status !== BookingStatus.COMPLETED) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "A follow-up session can only be booked for completed bookings.",
    );
  }

  // 3. Permissions Check
  if (caller.role === UserRole.COACH) {
    const isLead = originalBooking.coachUserId != null && originalBooking.coachUserId === caller.id;
    const isCoHost = (originalBooking.coCoachUserIds ?? []).includes(caller.id);
    if (!isLead && !isCoHost) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to book a follow-up for this booking.",
      );
    }
  } else if (caller.role === UserRole.TEAM_ADMIN) {
    if (originalBooking.team.teamLeadId !== caller.id) {
      throw new ErrorHandler(
        StatusCodes.FORBIDDEN,
        "You do not have permission to manage this team.",
      );
    }
  } else if (caller.role !== UserRole.SUPER_ADMIN) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Unauthorized role.");
  }

  // 4. Verify entities are still active/exist
  if (!originalBooking.team || !originalBooking.team.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The team associated with the original booking is deleted or inactive.",
    );
  }

  if (!originalBooking.event || !originalBooking.event.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The event associated with the original booking is deleted or inactive.",
    );
  }

  if (originalBooking.event.sessionTypeId) {
    const sessionType = await prisma.sessionType.findUnique({
      where: { id: originalBooking.event.sessionTypeId },
    });
    if (!sessionType || !sessionType.isActive) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "The session type associated with this event is deleted or inactive.",
      );
    }
  }

  if (originalBooking.coachUserId === null) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Cannot book a follow-up for an anonymous session without an assigned coach.",
    );
  }

  const coachUser = await prisma.user.findUnique({
    where: { id: originalBooking.coachUserId },
  });
  if (!coachUser || !coachUser.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The assigned coach is no longer active or exists.",
    );
  }

  const eventCoach = await prisma.eventCoach.findUnique({
    where: {
      eventId_coachUserId: {
        eventId: originalBooking.eventId,
        coachUserId: originalBooking.coachUserId,
      },
    },
  });
  if (!eventCoach || !eventCoach.isActive) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "The assigned coach is no longer assigned to this event.",
    );
  }

  // 5. Parse time and resolve booking window/slot constraints
  const start = parseBookingStartTime(payload.startTime);
  const event = await getBookableEvent(originalBooking.teamId, originalBooking.eventId);
  const { end, schedulingContext } = resolveBookingWindow(event, start);
  const { matchedScheduleSlot, allowSharedSessionOverlap } = await resolveSlotContext(event, start);

  const activeCoaches = event.coaches as CoachCandidate[];

  // 6. Database Transaction & Pessimistic Locks
  const followUpBooking = await prisma.$transaction(
    async (tx) => {
      if (matchedScheduleSlot) {
        await lockScheduleSlot(tx, matchedScheduleSlot.id);
      } else {
        await lockEvent(tx, event.id);
      }

      // Check coach selection and assignment logic inside transaction
      const { assignedCoachId, meetingJoinUrl, coCoachUserIds } =
        await resolveBookingCoachSelection({
          preferredCoachId: originalBooking.coachUserId ?? undefined,
          activeCoaches,
          event,
          start,
          end,
          allowSharedSessionOverlap,
          matchedScheduleSlotId: matchedScheduleSlot?.id,
          tx,
        });

      if (assignedCoachId === null) {
        throw new ErrorHandler(
          StatusCodes.CONFLICT,
          "Cannot book a follow-up for an anonymous session without an assigned coach.",
        );
      }

      await lockCoach(tx, assignedCoachId);

      // Re-verify coach is still active after acquiring the row lock (closes TOCTOU window)
      const lockedCoachUser = await tx.user.findUnique({ where: { id: assignedCoachId } });
      if (!lockedCoachUser?.isActive) {
        throw new ErrorHandler(
          StatusCodes.CONFLICT,
          "The assigned coach is no longer active.",
        );
      }
      const lockedEventCoach = await tx.eventCoach.findUnique({
        where: {
          eventId_coachUserId: { eventId: originalBooking.eventId, coachUserId: assignedCoachId },
        },
      });
      if (!lockedEventCoach?.isActive) {
        throw new ErrorHandler(
          StatusCodes.CONFLICT,
          "The assigned coach is no longer assigned to this event.",
        );
      }

      const scheduleSlot =
        matchedScheduleSlot ?? (await resolveMatchingScheduleSlot(event.id, start, tx));

      // Capacity check (FIXED_SLOTS only — see booking creation comment)
      if (schedulingContext.bookingMode === "FIXED_SLOTS") {
        const { maxParticipants } = getEffectiveParticipantPolicy(schedulingContext, scheduleSlot);
        const currentParticipantCount = await countActiveParticipantsForTime(tx, event.id, start);
        assertParticipantCapacityAvailable(maxParticipants, currentParticipantCount);
      }

      // Prevent overlapping booking for the same student
      const duplicateBooking = await tx.booking.findFirst({
        where: {
          studentEmail: originalBooking.studentEmail,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          OR: [
            { startTime: { lte: start }, endTime: { gt: start } },
            { startTime: { lt: end }, endTime: { gte: end } },
            { startTime: { gte: start }, endTime: { lte: end } },
          ],
        },
      });
      if (duplicateBooking) {
        throw new ErrorHandler(
          StatusCodes.CONFLICT,
          "This student already has a booking overlapping with the selected time.",
        );
      }

      // Upsert student profile
      const student = await upsertStudentForBooking(
        tx,
        originalBooking.studentName,
        originalBooking.studentEmail,
        start,
      );

      return createBookingRecord(tx, {
        studentId: student.id,
        scheduleSlotId: scheduleSlot?.id ?? null,
        studentName: originalBooking.studentName,
        studentEmail: originalBooking.studentEmail,
        teamId: originalBooking.teamId,
        eventId: originalBooking.eventId,
        coachUserId: assignedCoachId,
        coCoachUserIds,
        startTime: start,
        endTime: end,
        timezone: payload.timezone || originalBooking.timezone || "UTC",
        notes:
          payload.notes ?? `Follow-up to booking ${originalBooking.id.slice(0, 8).toUpperCase()}`,
        specificQuestion: payload.specificQuestion || null,
        triedSolutions: payload.triedSolutions || null,
        usedResources: payload.usedResources || null,
        sessionObjectives: payload.sessionObjectives || null,
        meetingJoinUrl,
        status: BookingStatus.CONFIRMED,
      });
    },
    { timeout: 15000 },
  );

  void queueBookingCreatedNotifications(followUpBooking);

  return followUpBooking;
};

export {
  createBooking,
  getBooking,
  listBookings,
  updateBooking,
  rescheduleBooking,
  cancelBooking,
  bookFollowUpSession,
};

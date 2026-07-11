import { BookingStatus, UserRole, BookingActivityType, BookingActivityActor } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { recordBookingActivity, upsertBookingActivityByType } from "../bookings/bookingActivity.service";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import { getRequestLogger } from "../../shared/logging/requestContext";
import { queueStudentFeedbackNotification } from "../bookings/booking.notification";
import { bookingInclude } from "../bookings/booking.shared";

export type UpsertSessionLogInput = {
  topicsDiscussed?: string | null;
  summary?: string | null;
  coachNotes?: string | null;
  assignedCoachId?: string;
  attendance: Array<{ bookingId: string; attended: boolean }>;
};

export const assertSlotLogAccess = async (slotId: string, caller: CallerContext): Promise<void> => {
  if (caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN) return;

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
    select: {
      assignedCoachId: true,
      event: {
        select: {
          allowAnonymousBooking: true,
          coaches: { where: { isActive: true }, select: { coachUserId: true } },
        },
      },
    },
  });

  if (!slot) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found.");
  }

  // For anonymous events, any active pool coach may log the session
  if (slot.event.allowAnonymousBooking) {
    const isPoolCoach = slot.event.coaches.some((c) => c.coachUserId === caller.id);
    if (isPoolCoach) return;
  }

  if (slot.assignedCoachId === caller.id) return;

  const coCoachBooking = await prisma.booking.findFirst({
    where: {
      scheduleSlotId: slotId,
      coCoachUserIds: { has: caller.id },
    },
    select: { id: true },
  });

  if (coCoachBooking) return;

  getRequestLogger().warn({ slotId, callerId: caller.id }, "Session log access denied.");
  throw new ErrorHandler(StatusCodes.FORBIDDEN, "You do not have permission to log this session.");
};

const verifySlotBelongsToEvent = async (eventId: string, slotId: string): Promise<void> => {
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
    select: { eventId: true },
  });

  if (!slot) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found.");
  }

  if (slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }
};

export const getSessionLog = async (eventId: string, slotId: string, caller: CallerContext) => {
  await assertSlotLogAccess(slotId, caller);
  await verifySlotBelongsToEvent(eventId, slotId);

  return prisma.sessionLog.findUnique({
    where: { scheduleSlotId: slotId },
    include: {
      attendance: {
        include: { booking: true },
      },
      loggedBy: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      },
    },
  });
};

export const upsertSessionLog = async (
  eventId: string,
  slotId: string,
  payload: UpsertSessionLogInput,
  caller: CallerContext,
) => {
  await assertSlotLogAccess(slotId, caller);
  await verifySlotBelongsToEvent(eventId, slotId);

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
    select: { startTime: true },
  });

  if (slot && new Date(slot.startTime) > new Date()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Cannot log a session before it has started.");
  }

  const slotBookings = await prisma.booking.findMany({
    where: { scheduleSlotId: slotId },
    select: { id: true, status: true, coachUserId: true },
  });

  const slotBookingIds = new Set(slotBookings.map((b) => b.id));
  const bookingMap = Object.fromEntries(slotBookings.map((b) => [b.id, b]));

  const invalidIds = payload.attendance
    .map((a) => a.bookingId)
    .filter((id) => !slotBookingIds.has(id));

  if (invalidIds.length > 0) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `Booking IDs do not belong to this slot: ${invalidIds.join(", ")}`,
    );
  }

  // Track which bookings are transitioning to COMPLETED before the transaction
  // so we can fire feedback emails after it commits — without N+1 queries.
  const transitioningToCompletedIds = payload.attendance
    .filter((a) => {
      const booking = bookingMap[a.bookingId];
      return (
        a.attended === true &&
        booking.status !== BookingStatus.COMPLETED &&
        booking.status !== BookingStatus.CANCELLED &&
        booking.status !== BookingStatus.PENDING
      );
    })
    .map((a) => a.bookingId);

  const result = await prisma.$transaction(async (tx) => {
    // Distinguish a first-time log from an edit so we don't re-emit timeline
    // entries every time the slot log is re-saved.
    const existingLog = await tx.sessionLog.findUnique({
      where: { scheduleSlotId: slotId },
      select: { id: true, topicsDiscussed: true, summary: true, coachNotes: true },
    });
    const isFirstLog = !existingLog;
    const existingAttendances = await tx.sessionAttendance.findMany({
      where: { bookingId: { in: slotBookings.map((b) => b.id) } },
      select: { bookingId: true, attended: true },
    });
    const previousAttendance = Object.fromEntries(
      existingAttendances.map((a) => [a.bookingId, a.attended]),
    );

    const log = await tx.sessionLog.upsert({
      where: { scheduleSlotId: slotId },
      create: {
        scheduleSlotId: slotId,
        loggedByUserId: caller.id,
        topicsDiscussed: payload.topicsDiscussed ?? null,
        summary: payload.summary ?? null,
        coachNotes: payload.coachNotes ?? null,
      },
      update: {
        topicsDiscussed: payload.topicsDiscussed ?? null,
        summary: payload.summary ?? null,
        coachNotes: payload.coachNotes ?? null,
        updatedAt: new Date(),
      },
    });

    // For anonymous sessions: assign the coach retroactively when logging.
    // No emails are sent — the session is already over.
    if (payload.assignedCoachId) {
      await tx.eventScheduleSlot.update({
        where: { id: slotId },
        // Unreachable today for deferCoachReveal slots (mutually exclusive with anonymous
        // events), but nulling sessionJoinUrl here anyway mirrors updateEventScheduleSlot's
        // reassignment guard, so any coach change through this path can't leave a stale
        // join-link snapshot behind either.
        data: { assignedCoachId: payload.assignedCoachId, sessionJoinUrl: null },
      });

      await tx.booking.updateMany({
        where: {
          scheduleSlotId: slotId,
          status: { not: BookingStatus.CANCELLED },
        },
        data: { coachUserId: payload.assignedCoachId },
      });

      // Collect reassigned bookings for post-transaction activity writes.
      const reassignedBookings = slotBookings.filter(
        (b) => b.status !== BookingStatus.CANCELLED && b.coachUserId !== payload.assignedCoachId,
      );
      return { reassignedBookings, isFirstLog, previousAttendance, existingLog };
    }

    // Collect per-booking attendance change context for post-transaction activity writes.
    for (const entry of payload.attendance) {
      await tx.sessionAttendance.upsert({
        where: { bookingId: entry.bookingId },
        create: { sessionLogId: log.id, bookingId: entry.bookingId, attended: entry.attended },
        update: { attended: entry.attended },
      });

      const booking = bookingMap[entry.bookingId];
      if (booking.status !== BookingStatus.CANCELLED && booking.status !== BookingStatus.PENDING) {
        const newStatus = entry.attended ? BookingStatus.COMPLETED : BookingStatus.NO_SHOW;
        await tx.booking.update({ where: { id: entry.bookingId }, data: { status: newStatus } });
      }
    }

    const logResult = await tx.sessionLog.findUnique({
      where: { id: log.id },
      include: {
        attendance: { include: { booking: true } },
        loggedBy: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });

    const attendedCount = payload.attendance.filter((a) => a.attended).length;
    const absent = payload.attendance.length - attendedCount;
    getRequestLogger().info({ slotId, eventId, attended: attendedCount, absent, loggedBy: caller.id }, "Session log saved.");

    return { logResult, isFirstLog, previousAttendance, reassignedBookings: [] as typeof slotBookings, existingLog };
  });

  const { logResult, isFirstLog, previousAttendance, reassignedBookings, existingLog } = result;
  const actorRole = caller.role === UserRole.COACH ? BookingActivityActor.COACH : BookingActivityActor.ADMIN;

  for (const b of reassignedBookings) {
    try {
      await recordBookingActivity(
        prisma, b.id, BookingActivityType.COACH_REASSIGNED, actorRole, caller.id, null,
        { previousCoachId: b.coachUserId, newCoachId: payload.assignedCoachId },
      );
    } catch (e) {
      getRequestLogger().error({ error: e, bookingId: b.id }, "Failed to record COACH_REASSIGNED activity.");
    }
  }

  for (const entry of payload.attendance) {
    const booking = bookingMap[entry.bookingId];
    if (booking.status !== BookingStatus.CANCELLED && booking.status !== BookingStatus.PENDING) {
      const newStatus = entry.attended ? BookingStatus.COMPLETED : BookingStatus.NO_SHOW;
      const statusChanged = booking.status !== newStatus;
      const attendanceChanged =
        !(entry.bookingId in previousAttendance) ||
        previousAttendance[entry.bookingId] !== entry.attended;

      if (statusChanged) {
        try {
          await recordBookingActivity(
            prisma, entry.bookingId,
            entry.attended ? BookingActivityType.SESSION_COMPLETED : BookingActivityType.SESSION_NO_SHOW,
            actorRole, caller.id, null,
          );
        } catch (e) {
          getRequestLogger().error({ error: e, bookingId: entry.bookingId }, "Failed to record session status activity.");
        }
      }
      if (attendanceChanged) {
        try {
          // Upsert rather than insert — attendance may toggle back and forth, so we
          // keep exactly one "current attendance state" entry per booking rather than
          // accumulating a new entry on every toggle.
          await upsertBookingActivityByType(
            prisma, entry.bookingId, BookingActivityType.ATTENDANCE_UPDATED,
            actorRole, caller.id, null, { attended: entry.attended },
          );
        } catch (e) {
          getRequestLogger().error({ error: e, bookingId: entry.bookingId }, "Failed to record ATTENDANCE_UPDATED activity.");
        }
      }
      if (isFirstLog) {
        try {
          await recordBookingActivity(
            prisma, entry.bookingId, BookingActivityType.SESSION_LOGGED,
            actorRole, caller.id, null,
          );
        } catch (e) {
          getRequestLogger().error({ error: e, bookingId: entry.bookingId }, "Failed to record SESSION_LOGGED activity.");
        }
      }
    }
  }

  // Emit SESSION_LOG_UPDATED when notes fields change on a subsequent edit.
  // Upserted so repeated note tweaks produce a single "last updated" entry.
  if (!isFirstLog) {
    const notesChanged =
      (payload.topicsDiscussed ?? null) !== (existingLog?.topicsDiscussed ?? null) ||
      (payload.summary ?? null) !== (existingLog?.summary ?? null) ||
      (payload.coachNotes ?? null) !== (existingLog?.coachNotes ?? null);

    if (notesChanged) {
      for (const b of slotBookings.filter((b) => b.status !== BookingStatus.CANCELLED)) {
        try {
          await upsertBookingActivityByType(
            prisma, b.id, BookingActivityType.SESSION_LOG_UPDATED,
            actorRole, caller.id, null,
          );
        } catch (e) {
          getRequestLogger().error({ error: e, bookingId: b.id }, "Failed to record SESSION_LOG_UPDATED activity.");
        }
      }
    }
  }

  // Fire feedback emails after transaction commits — single batch query, not N+1.
  if (transitioningToCompletedIds.length > 0) {
    const completedBookings = await prisma.booking.findMany({
      where: { id: { in: transitioningToCompletedIds } },
      include: bookingInclude,
    });

    await Promise.allSettled(
      completedBookings.map((b) => queueStudentFeedbackNotification(b as any)),
    );
  }

  return logResult;
};

import { BookingStatus, UserRole, BookingActivityType, BookingActivityActor } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { getRequestLogger } from "../../shared/logging/requestContext";
import { recordBookingActivity } from "./bookingActivity.service";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import { assertSlotLogAccess } from "../events/sessionLog.service";
import { queueStudentFeedbackNotification } from "./booking.notification";
import { findBookingById } from "./booking.repository";

export type UpsertBookingSessionLogInput = {
  topicsDiscussed?: string | null;
  summary?: string | null;
  coachNotes?: string | null;
  attended?: boolean;
};

const sessionLogReadInclude = {
  attendance: {
    include: { booking: true },
  },
  loggedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
  },
} as const;

const assertBookingLogAccess = (
  booking: { coachUserId: string | null; coCoachUserIds: string[] },
  caller: CallerContext,
): void => {
  if (caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN) return;
  if (booking.coachUserId != null && booking.coachUserId === caller.id) return;
  if (booking.coCoachUserIds.includes(caller.id)) return;
  throw new ErrorHandler(
    StatusCodes.FORBIDDEN,
    "You do not have permission to view this session log.",
  );
};

const loadBookingForLog = async (bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      coachUserId: true,
      coCoachUserIds: true,
      scheduleSlotId: true,
      status: true,
      startTime: true,
    },
  });

  if (!booking) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking not found.");
  }

  return booking;
};

export const getBookingSessionLog = async (bookingId: string, caller: CallerContext) => {
  const booking = await loadBookingForLog(bookingId);

  // For slot-based bookings, delegate auth to the events-side slot rule
  // (consistent with the existing /events/:eventId/schedule-slots/:slotId/log endpoint).
  if (booking.scheduleSlotId) {
    await assertSlotLogAccess(booking.scheduleSlotId, caller);
    return prisma.sessionLog.findUnique({
      where: { scheduleSlotId: booking.scheduleSlotId },
      include: sessionLogReadInclude,
    });
  }

  assertBookingLogAccess(booking, caller);
  return prisma.sessionLog.findUnique({
    where: { bookingId },
    include: sessionLogReadInclude,
  });
};

export const upsertBookingSessionLog = async (
  bookingId: string,
  payload: UpsertBookingSessionLogInput,
  caller: CallerContext,
) => {
  const booking = await loadBookingForLog(bookingId);

  // Group bookings must be logged via the slot-based endpoint to keep
  // attendance consistent across all participants in the slot.
  if (booking.scheduleSlotId) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Group sessions must be logged via the schedule view.",
    );
  }

  if (new Date(booking.startTime).getTime() > Date.now()) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Cannot log a session before it has started.");
  }

  assertBookingLogAccess(booking, caller);

  // Determine whether this call will transition the booking to COMPLETED
  // before the transaction, so we can fire the feedback email after it commits.
  const isTransitioningToCompleted =
    payload.attended === true &&
    booking.status !== BookingStatus.COMPLETED &&
    booking.status !== BookingStatus.CANCELLED &&
    booking.status !== BookingStatus.PENDING;

  const result = await prisma.$transaction(async (tx) => {
    // Distinguish a first-time log from an edit so we don't re-emit timeline
    // entries (SESSION_LOGGED, status, attendance) every time the log is re-saved.
    const existingLog = await tx.sessionLog.findUnique({
      where: { bookingId },
      select: { id: true },
    });
    const isFirstLog = !existingLog;
    const existingAttendance = await tx.sessionAttendance.findUnique({
      where: { bookingId },
      select: { attended: true },
    });

    const log = await tx.sessionLog.upsert({
      where: { bookingId },
      create: {
        bookingId,
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

    if (payload.attended !== undefined) {
      await tx.sessionAttendance.upsert({
        where: { bookingId },
        create: {
          sessionLogId: log.id,
          bookingId,
          attended: payload.attended,
        },
        update: { attended: payload.attended },
      });

      if (booking.status !== BookingStatus.CANCELLED && booking.status !== BookingStatus.PENDING) {
        const newStatus = payload.attended ? BookingStatus.COMPLETED : BookingStatus.NO_SHOW;
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: newStatus },
        });

        // Collect which activities to emit — written post-transaction (best-effort).
        const actorRole = caller.role === UserRole.COACH ? BookingActivityActor.COACH : BookingActivityActor.ADMIN;
        const statusChanged = booking.status !== newStatus;
        const attendanceChanged = !existingAttendance || existingAttendance.attended !== payload.attended;
        return {
          log: await tx.sessionLog.findUnique({ where: { id: log.id }, include: sessionLogReadInclude }),
          actorRole,
          statusChanged,
          attendanceChanged,
          isFirstLog,
          attended: payload.attended,
        };
      }
    }

    return {
      log: await tx.sessionLog.findUnique({ where: { id: log.id }, include: sessionLogReadInclude }),
      actorRole: null,
      statusChanged: false,
      attendanceChanged: false,
      isFirstLog: false,
      attended: undefined as boolean | undefined,
    };
  });

  const { log: sessionLogResult, actorRole, statusChanged, attendanceChanged, isFirstLog: firstLog, attended } = result;

  // Best-effort — activity writes must never roll back a committed session log.
  if (actorRole !== null && payload.attended !== undefined) {
    if (statusChanged) {
      void recordBookingActivity(
        prisma, bookingId,
        attended ? BookingActivityType.SESSION_COMPLETED : BookingActivityType.SESSION_NO_SHOW,
        actorRole, caller.id, null,
      ).catch((e) => getRequestLogger().error({ error: e, bookingId }, "Failed to record session status activity."));
    }
    if (attendanceChanged) {
      void recordBookingActivity(
        prisma, bookingId, BookingActivityType.ATTENDANCE_UPDATED,
        actorRole, caller.id, null, { attended },
      ).catch((e) => getRequestLogger().error({ error: e, bookingId }, "Failed to record ATTENDANCE_UPDATED activity."));
    }
    if (firstLog) {
      void recordBookingActivity(
        prisma, bookingId, BookingActivityType.SESSION_LOGGED,
        actorRole, caller.id, null,
      ).catch((e) => getRequestLogger().error({ error: e, bookingId }, "Failed to record SESSION_LOGGED activity."));
    }
  }

  if (isTransitioningToCompleted) {
    const fullBooking = await findBookingById(bookingId);
    await queueStudentFeedbackNotification(fullBooking);
  }

  return sessionLogResult;
};

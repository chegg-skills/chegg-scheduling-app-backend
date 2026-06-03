import { BookingStatus, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
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
  booking: { coachUserId: string; coCoachUserIds: string[] },
  caller: CallerContext,
): void => {
  if (caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN) return;
  if (booking.coachUserId === caller.id) return;
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
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            status: payload.attended ? BookingStatus.COMPLETED : BookingStatus.NO_SHOW,
          },
        });
      }
    }

    return tx.sessionLog.findUnique({
      where: { id: log.id },
      include: sessionLogReadInclude,
    });
  });

  if (isTransitioningToCompleted) {
    const fullBooking = await findBookingById(bookingId);
    await queueStudentFeedbackNotification(fullBooking);
  }

  return result;
};

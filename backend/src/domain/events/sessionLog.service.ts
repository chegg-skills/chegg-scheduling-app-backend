import { BookingStatus, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";

export type UpsertSessionLogInput = {
  topicsDiscussed?: string | null;
  summary?: string | null;
  coachNotes?: string | null;
  attendance: Array<{ bookingId: string; attended: boolean }>;
};

const assertSlotLogAccess = async (
  slotId: string,
  caller: CallerContext,
): Promise<void> => {
  if (caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN) return;

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
    select: { assignedCoachId: true },
  });

  if (!slot) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found.");
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

  throw new ErrorHandler(
    StatusCodes.FORBIDDEN,
    "You do not have permission to log this session.",
  );
};

const verifySlotBelongsToEvent = async (
  eventId: string,
  slotId: string,
): Promise<void> => {
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

export const getSessionLog = async (
  eventId: string,
  slotId: string,
  caller: CallerContext,
) => {
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

  const slotBookings = await prisma.booking.findMany({
    where: { scheduleSlotId: slotId },
    select: { id: true, status: true },
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

  return prisma.$transaction(async (tx) => {
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

    for (const entry of payload.attendance) {
      await tx.sessionAttendance.upsert({
        where: { bookingId: entry.bookingId },
        create: {
          sessionLogId: log.id,
          bookingId: entry.bookingId,
          attended: entry.attended,
        },
        update: { attended: entry.attended },
      });

      const booking = bookingMap[entry.bookingId];
      if (
        booking.status !== BookingStatus.CANCELLED &&
        booking.status !== BookingStatus.PENDING
      ) {
        await tx.booking.update({
          where: { id: entry.bookingId },
          data: {
            status: entry.attended ? BookingStatus.COMPLETED : BookingStatus.NO_SHOW,
          },
        });
      }
    }

    return tx.sessionLog.findUnique({
      where: { id: log.id },
      include: {
        attendance: {
          include: { booking: true },
        },
        loggedBy: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });
  });
};

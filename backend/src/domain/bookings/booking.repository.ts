import { BookingStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { rethrowPrismaError } from "../../shared/error/prismaError";
import {
  bookableEventInclude,
  bookingInclude,
  buildBookingListWhere,
  type BookableEvent,
  type ListBookingsFilters,
  type SafeBooking,
} from "./booking.shared";

const findBookableEvent = async (eventId: string): Promise<BookableEvent | null> => {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: bookableEventInclude,
  });
};

const upsertStudentForBooking = async (
  tx: Prisma.TransactionClient,
  studentName: string,
  studentEmail: string,
  bookedAt: Date,
) => {
  return tx.student.upsert({
    where: { email: studentEmail },
    update: {
      fullName: studentName,
      lastBookedAt: bookedAt,
    },
    create: {
      fullName: studentName,
      email: studentEmail,
      firstBookedAt: bookedAt,
      lastBookedAt: bookedAt,
    },
  });
};

const lockScheduleSlot = async (tx: Prisma.TransactionClient, slotId: string): Promise<void> => {
  // Acquire a row-level lock on the schedule slot to prevent concurrent capacity checks
  await tx.$executeRaw`SELECT id FROM "EventScheduleSlot" WHERE id = ${slotId} FOR UPDATE`;
};

const lockEvent = async (tx: Prisma.TransactionClient, eventId: string): Promise<void> => {
  // Acquire a row-level lock on the event to prevent concurrent capacity checks for non-slot events
  await tx.$executeRaw`SELECT id FROM "Event" WHERE id = ${eventId} FOR UPDATE`;
};

const lockHost = async (tx: Prisma.TransactionClient, hostUserId: string): Promise<void> => {
  // Acquire a row-level lock on the host user to prevent concurrent double-booking of the same host
  await tx.$executeRaw`SELECT id FROM "User" WHERE id = ${hostUserId} FOR UPDATE`;
};

const countActiveParticipantsForTime = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  startTime: Date,
): Promise<number> => {
  return tx.booking.count({
    where: {
      eventId,
      startTime,
      status: { not: BookingStatus.CANCELLED },
    },
  });
};

const createBookingRecord = async (
  tx: Prisma.TransactionClient,
  data: Prisma.BookingUncheckedCreateInput,
): Promise<SafeBooking> => {
  return tx.booking.create({
    data,
    include: bookingInclude,
  });
};

const findBookingById = async (id: string): Promise<SafeBooking> => {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });

  if (!booking) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking not found.");
  }

  return booking;
};

const findBookingByToken = async (id: string, token: string): Promise<SafeBooking> => {
  const booking = await prisma.booking.findFirst({
    where: { id, rescheduleToken: token } as any,
    include: bookingInclude,
  });

  if (!booking) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking not found or invalid token.");
  }

  return booking;
};

const findBookings = async (filters: ListBookingsFilters): Promise<SafeBooking[]> => {
  const { page = 1, limit = 10 } = filters;
  const skip = (page - 1) * limit;

  return prisma.booking.findMany({
    where: buildBookingListWhere(filters),
    include: bookingInclude,
    orderBy: { startTime: "desc" },
    skip,
    take: limit,
  });
};

const countBookings = async (filters: ListBookingsFilters): Promise<number> => {
  return prisma.booking.count({
    where: buildBookingListWhere(filters),
  });
};

const updateBookingById = async (
  id: string,
  data: {
    status?: BookingStatus;
    coHostUserIds?: string[];
    startTime?: Date;
    endTime?: Date;
    timezone?: string;
    hostUserId?: string;
    meetingJoinUrl?: string | null;
    scheduleSlotId?: string | null;
  },
): Promise<SafeBooking> => {
  try {
    return await prisma.booking.update({
      where: { id },
      data,
      include: bookingInclude,
    });
  } catch (error) {
    return rethrowPrismaError(error, {
      P2025: { status: StatusCodes.NOT_FOUND, message: "Booking not found." },
    });
  }
};

export {
  countActiveParticipantsForTime,
  createBookingRecord,
  findBookableEvent,
  findBookingById,
  findBookingByToken,
  findBookings,
  countBookings,
  updateBookingById,
  upsertStudentForBooking,
  lockScheduleSlot,
  lockEvent,
  lockHost,
};

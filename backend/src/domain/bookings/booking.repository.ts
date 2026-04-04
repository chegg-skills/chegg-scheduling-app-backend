import { BookingStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
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

const findBookings = async (
    filters: ListBookingsFilters,
): Promise<SafeBooking[]> => {
    return prisma.booking.findMany({
        where: buildBookingListWhere(filters),
        include: bookingInclude,
        orderBy: { startTime: "desc" },
    });
};

const updateBookingStatusById = async (
    id: string,
    status: BookingStatus,
): Promise<SafeBooking> => {
    try {
        return await prisma.booking.update({
            where: { id },
            data: { status },
            include: bookingInclude,
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2025"
        ) {
            throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking not found.");
        }

        throw error;
    }
};

export {
    countActiveParticipantsForTime,
    createBookingRecord,
    findBookableEvent,
    findBookingById,
    findBookings,
    updateBookingStatusById,
    upsertStudentForBooking,
};

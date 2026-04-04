import { BookingStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { normalizeEmail } from "../../shared/utils/userUtils";

export type CreateBookingInput = {
    studentName: string;
    studentEmail: string;
    teamId: string;
    eventId: string;
    startTime: string | Date;
    timezone?: string;
    notes?: string;
    specificQuestion?: string;
    triedSolutions?: string;
    usedResources?: string;
    sessionObjectives?: string;
    preferredHostId?: string;
};

export type UpdateBookingStatusInput = {
    status: BookingStatus;
};

export type ListBookingsFilters = {
    teamId?: string;
    eventId?: string;
    hostUserId?: string;
    status?: BookingStatus;
    search?: string;
};

export const bookingInclude = Prisma.validator<Prisma.BookingInclude>()({
    student: {
        select: {
            id: true,
            fullName: true,
            email: true,
            firstBookedAt: true,
            lastBookedAt: true,
            createdAt: true,
            updatedAt: true,
        },
    },
    team: true,
    event: true,
    host: {
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            timezone: true,
            avatarUrl: true,
            zoomIsvLink: true,
        },
    },
});

export type SafeBooking = Prisma.BookingGetPayload<{
    include: typeof bookingInclude;
}>;

export const bookableEventInclude = Prisma.validator<Prisma.EventInclude>()({
    interactionType: {
        select: {
            minParticipants: true,
            maxParticipants: true,
        },
    },
    hosts: {
        where: { isActive: true },
        orderBy: { hostOrder: "asc" },
        include: {
            hostUser: {
                select: {
                    zoomIsvLink: true,
                },
            },
        },
    },
    routingState: true,
});

export type BookableEvent = Prisma.EventGetPayload<{
    include: typeof bookableEventInclude;
}>;

export type BookingSchedulingContext = Pick<
    BookableEvent,
    | "id"
    | "bookingMode"
    | "allowedWeekdays"
    | "minimumNoticeMinutes"
    | "minParticipantCount"
    | "maxParticipantCount"
    | "interactionType"
>;

export const normalizeStudentName = (studentName: string): string => {
    const normalizedName = studentName?.trim();

    if (!normalizedName) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentName is required.");
    }

    return normalizedName;
};

export const normalizeStudentEmailAddress = (studentEmail: string): string => {
    const normalizedStudentEmail = normalizeEmail(studentEmail ?? "");

    if (!normalizedStudentEmail) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentEmail is required.");
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedStudentEmail);
    if (!isValidEmail) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "A valid studentEmail is required.");
    }

    return normalizedStudentEmail;
};

export const parseBookingStartTime = (startTime: string | Date): Date => {
    const start = new Date(startTime);

    if (Number.isNaN(start.getTime())) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid startTime provided.");
    }

    const gracePeriodMs = 5 * 60 * 1000;
    if (start.getTime() < Date.now() - gracePeriodMs) {
        throw new ErrorHandler(
            StatusCodes.BAD_REQUEST,
            "Cannot book a session that has already finished or started too long ago.",
        );
    }

    return start;
};

export const buildSchedulingContext = (
    event: BookableEvent,
): BookingSchedulingContext => ({
    id: event.id,
    bookingMode: event.bookingMode,
    allowedWeekdays: event.allowedWeekdays,
    minimumNoticeMinutes: event.minimumNoticeMinutes,
    minParticipantCount: event.minParticipantCount,
    maxParticipantCount: event.maxParticipantCount,
    interactionType: event.interactionType,
});

export const buildBookingListWhere = (
    filters: ListBookingsFilters,
): Prisma.BookingWhereInput => {
    const normalizedSearch = filters.search?.trim();
    const hasSearch = Boolean(normalizedSearch);

    return {
        teamId: filters.teamId,
        eventId: filters.eventId,
        hostUserId: filters.hostUserId,
        status: filters.status,
        ...(hasSearch
            ? {
                OR: [
                    {
                        studentName: {
                            contains: normalizedSearch,
                            mode: "insensitive",
                        },
                    },
                    {
                        studentEmail: {
                            contains: normalizedSearch,
                            mode: "insensitive",
                        },
                    },
                    {
                        id: {
                            contains: normalizedSearch,
                            mode: "insensitive",
                        },
                    },
                ],
            }
            : {}),
    };
};

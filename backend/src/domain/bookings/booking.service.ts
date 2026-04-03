import { AssignmentStrategy, BookingStatus, Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { normalizeEmail } from "../../shared/utils/userUtils";
import { isHostAvailable } from "../availability/availability.service";

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

const normalizeStudentName = (studentName: string): string => {
    const normalizedName = studentName?.trim();

    if (!normalizedName) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "studentName is required.");
    }

    return normalizedName;
};

const normalizeStudentEmailAddress = (studentEmail: string): string => {
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
        preferredHostId
    } = payload;

    const normalizedStudentName = normalizeStudentName(studentName);
    const normalizedStudentEmail = normalizeStudentEmailAddress(studentEmail);

    // 1. Validate inputs
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid startTime provided.");
    }
    if (start < new Date()) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Cannot book a session in the past.");
    }

    // 2. Fetch Event and Hosts
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
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
        },
    });

    if (!event || !event.isActive) {
        throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found or inactive.");
    }

    if (event.teamId !== teamId) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Event does not belong to the specified team.");
    }

    const durationSeconds = event.durationSeconds;
    const end = new Date(start.getTime() + durationSeconds * 1000);

    // 3. Determine Host Assignment
    let assignedHostId: string | null = null;
    let meetingJoinUrl: string | null = null;
    const activeHosts = event.hosts;

    if (activeHosts.length === 0) {
        throw new ErrorHandler(StatusCodes.SERVICE_UNAVAILABLE, "No active hosts available for this event.");
    }

    if (preferredHostId) {
        const host = activeHosts.find((candidateHost) => candidateHost.hostUserId === preferredHostId);

        if (!host) {
            throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Specified host is not eligible for this event.");
        }

        const available = await isHostAvailable(preferredHostId, start, end);
        if (!available) {
            throw new ErrorHandler(StatusCodes.CONFLICT, "The selected host is not available at this time.");
        }

        assignedHostId = preferredHostId;
        meetingJoinUrl = host.hostUser.zoomIsvLink ?? null;
    } else if (event.assignmentStrategy === AssignmentStrategy.DIRECT) {
        // Direct Assignment
        const targetHostId = activeHosts[0].hostUserId;
        const host = activeHosts.find(h => h.hostUserId === targetHostId);

        if (!host) {
            throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Specified host is not eligible for this event.");
        }

        const available = await isHostAvailable(targetHostId, start, end);
        if (!available) {
            throw new ErrorHandler(StatusCodes.CONFLICT, "The selected host is not available at this time.");
        }
        assignedHostId = targetHostId;
        meetingJoinUrl = host.hostUser.zoomIsvLink ?? null;
    } else {
        // Round-Robin Assignment
        const routingState = event.routingState || { nextHostOrder: 1 };
        const maxOrder = Math.max(...activeHosts.map(h => h.hostOrder));

        // Sort hosts so we can iterate from nextHostOrder
        const sortedHosts = [...activeHosts].sort((a, b) => a.hostOrder - b.hostOrder);

        // Start searching from nextHostOrder
        let startIndex = sortedHosts.findIndex(h => h.hostOrder >= routingState.nextHostOrder);
        if (startIndex === -1) startIndex = 0;

        for (let i = 0; i < sortedHosts.length; i++) {
            const index = (startIndex + i) % sortedHosts.length;
            const candidate = sortedHosts[index];

            const available = await isHostAvailable(candidate.hostUserId, start, end);
            if (available) {
                assignedHostId = candidate.hostUserId;
                meetingJoinUrl = candidate.hostUser.zoomIsvLink ?? null;

                // Update routing state for next time
                const nextOrder = (candidate.hostOrder % maxOrder) + 1;
                await prisma.eventRoutingState.upsert({
                    where: { eventId },
                    update: { nextHostOrder: nextOrder },
                    create: { eventId, nextHostOrder: nextOrder }
                });
                break;
            }
        }

        if (!assignedHostId) {
            throw new ErrorHandler(StatusCodes.CONFLICT, "No available hosts found for the requested time slot.");
        }
    }

    if (!assignedHostId) {
        throw new ErrorHandler(StatusCodes.CONFLICT, "No available hosts found for the requested time slot.");
    }

    // 4. Create Booking and link the external student identity
    return prisma.$transaction(async (tx) => {
        const student = await upsertStudentForBooking(
            tx,
            normalizedStudentName,
            normalizedStudentEmail,
            start,
        );

        return tx.booking.create({
            data: {
                studentId: student.id,
                studentName: normalizedStudentName,
                studentEmail: normalizedStudentEmail,
                teamId,
                eventId,
                hostUserId: assignedHostId,
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
            },
            include: bookingInclude,
        });
    });
};

const getBooking = async (id: string): Promise<SafeBooking> => {
    const booking = await prisma.booking.findUnique({
        where: { id },
        include: bookingInclude
    });

    if (!booking) {
        throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking not found.");
    }

    return booking;
};

const listBookings = async (filters: {
    teamId?: string;
    eventId?: string;
    hostUserId?: string;
    status?: BookingStatus;
    search?: string;
}): Promise<SafeBooking[]> => {
    const normalizedSearch = filters.search?.trim();
    const hasSearch = Boolean(normalizedSearch);

    const where: Prisma.BookingWhereInput = {
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

    return prisma.booking.findMany({
        where,
        include: bookingInclude,
        orderBy: { startTime: 'desc' }
    });
};

const updateBookingStatus = async (id: string, status: BookingStatus): Promise<SafeBooking> => {
    try {
        return await prisma.booking.update({
            where: { id },
            data: { status },
            include: bookingInclude
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            throw new ErrorHandler(StatusCodes.NOT_FOUND, "Booking not found.");
        }
        throw error;
    }
};

export {
    createBooking,
    getBooking,
    listBookings,
    updateBookingStatus
};

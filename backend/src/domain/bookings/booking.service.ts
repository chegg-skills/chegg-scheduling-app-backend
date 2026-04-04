import { AssignmentStrategy, BookingStatus, Prisma } from "@prisma/client";
import {
    AssignmentContext,
    getAssignmentStrategy,
    HostCandidate,
} from "./assignment.service";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { normalizeEmail } from "../../shared/utils/userUtils";
import { isHostAvailable } from "../availability/availability.service";
import {
    assertBookingNoticeSatisfied,
    assertBookingWeekdayAllowed,
    assertParticipantCapacityAvailable,
    resolveMatchingScheduleSlot,
    getEffectiveParticipantPolicy,
} from "../events/event.service";

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

    // Allow a small grace period (5 mins) to account for clock skew and user delay
    const GRACE_PERIOD_MS = 5 * 60 * 1000;
    if (start.getTime() < Date.now() - GRACE_PERIOD_MS) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Cannot book a session that has already finished or started too long ago.");
    }

    // 2. Fetch Event and Hosts
    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
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

    const schedulingContext = {
        id: event.id,
        bookingMode: (event as any).bookingMode,
        allowedWeekdays: (event as any).allowedWeekdays,
        minimumNoticeMinutes: (event as any).minimumNoticeMinutes,
        minParticipantCount: (event as any).minParticipantCount,
        maxParticipantCount: (event as any).maxParticipantCount,
        interactionType: (event as any).interactionType,
    };

    assertBookingWeekdayAllowed(
        schedulingContext.allowedWeekdays,
        start,
    );
    assertBookingNoticeSatisfied(
        schedulingContext.minimumNoticeMinutes,
        start,
    );

    const matchedScheduleSlot = await resolveMatchingScheduleSlot(
        event.id,
        start,
    );
    const allowSharedSessionOverlap = (event as any).bookingMode === "FIXED_SLOTS";

    if (allowSharedSessionOverlap && !matchedScheduleSlot) {
        throw new ErrorHandler(
            StatusCodes.CONFLICT,
            "The requested time does not match any predefined slot for this event.",
        );
    }
    const activeHosts = ((event as any).hosts ?? []) as HostCandidate[];

    if (activeHosts.length === 0) {
        throw new ErrorHandler(StatusCodes.SERVICE_UNAVAILABLE, "No active hosts available for this event.");
    }

    // 3. Create Booking (Assignment happens inside transaction for concurrency safety)
    return (prisma.$transaction(async (tx) => {
        let assignedHostId: string | null = null;
        let meetingJoinUrl: string | null = null;

        // Determine Host Assignment
        if (preferredHostId) {
            const host = activeHosts.find((candidateHost) => candidateHost.hostUserId === preferredHostId);

            if (!host) {
                throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Specified host is not eligible for this event.");
            }

            const available = await isHostAvailable(preferredHostId, start, end, {
                ignoreWeeklySchedule: (event as any).bookingMode === "FIXED_SLOTS",
                eventId: allowSharedSessionOverlap ? eventId : undefined,
                scheduleSlotId: allowSharedSessionOverlap ? matchedScheduleSlot?.id ?? null : undefined,
                tx: tx,
            });
            if (!available) {
                throw new ErrorHandler(StatusCodes.CONFLICT, "The selected host is not available at this time.");
            }

            assignedHostId = preferredHostId;
            meetingJoinUrl = host.hostUser.zoomIsvLink ?? null;
        } else {
            const strategyImplementation = getAssignmentStrategy(event.assignmentStrategy);
            const context: AssignmentContext = {
                prisma: tx,
                eventId: event.id,
                start,
                end,
                bookingMode: (event as any).bookingMode,
                allowSharedSessionOverlap,
                matchedScheduleSlotId: matchedScheduleSlot?.id,
            };

            const result = await strategyImplementation.resolveHost(activeHosts, context);
            assignedHostId = result.assignedHostId;
            meetingJoinUrl = result.meetingJoinUrl;
        }

        if (!assignedHostId) {
            throw new ErrorHandler(StatusCodes.CONFLICT, "No available hosts found for the requested time slot.");
        }

        const scheduleSlot = matchedScheduleSlot ?? (await resolveMatchingScheduleSlot(
            event.id,
            start,
        )) as any;

        const { maxParticipants } = getEffectiveParticipantPolicy(
            schedulingContext,
            scheduleSlot ?? (schedulingContext.interactionType as any),
        );

        const currentParticipantCount = await tx.booking.count({
            where: {
                eventId,
                startTime: start,
                status: { not: "CANCELLED" },
            },
        });

        assertParticipantCapacityAvailable(
            maxParticipants,
            currentParticipantCount,
        );

        const student = await upsertStudentForBooking(
            tx,
            normalizedStudentName,
            normalizedStudentEmail,
            start,
        );

        return tx.booking.create({
            data: {
                studentId: student.id,
                scheduleSlotId: scheduleSlot?.id ?? null,
                studentName: normalizedStudentName,
                studentEmail: normalizedStudentEmail,
                teamId: teamId,
                eventId: eventId,
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
    })) as any;
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

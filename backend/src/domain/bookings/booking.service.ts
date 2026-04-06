import { BookingStatus, Prisma } from "@prisma/client";
import {
    AssignmentContext,
    getAssignmentStrategy,
    HostCandidate,
} from "./assignment.service";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { isHostAvailable } from "../availability/availability.service";
import {
    assertBookingNoticeSatisfied,
    assertBookingWeekdayAllowed,
    assertParticipantCapacityAvailable,
    getEffectiveParticipantPolicy,
    resolveMatchingScheduleSlot,
} from "../events/eventScheduling.service";
import {
    countActiveParticipantsForTime,
    createBookingRecord,
    findBookableEvent,
    findBookingById,
    findBookings,
    updateBookingStatusById,
    upsertStudentForBooking,
} from "./booking.repository";
import {
    buildSchedulingContext,
    normalizeStudentEmailAddress,
    normalizeStudentName,
    parseBookingStartTime,
    type BookableEvent,
    type CreateBookingInput,
    type ListBookingsFilters,
    type SafeBooking,
} from "./booking.shared";

export { bookingInclude, type SafeBooking } from "./booking.shared";

export type { UpdateBookingStatusInput } from "./booking.shared";

const getBookableEvent = async (
    teamId: string,
    eventId: string,
): Promise<BookableEvent> => {
    const event = await findBookableEvent(eventId);

    if (!event || !event.isActive) {
        throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found or inactive.");
    }

    if (event.teamId !== teamId) {
        throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Event does not belong to the specified team.");
    }

    return event;
};

const resolveAssignedHost = async ({
    preferredHostId,
    activeHosts,
    event,
    start,
    end,
    allowSharedSessionOverlap,
    matchedScheduleSlotId,
    tx,
}: {
    preferredHostId?: string;
    activeHosts: HostCandidate[];
    event: BookableEvent;
    start: Date;
    end: Date;
    allowSharedSessionOverlap: boolean;
    matchedScheduleSlotId?: string | null;
    tx: Prisma.TransactionClient;
}): Promise<{ assignedHostId: string; meetingJoinUrl: string | null }> => {
    if (preferredHostId) {
        const host = activeHosts.find((candidateHost) => candidateHost.hostUserId === preferredHostId);

        if (!host) {
            throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Specified host is not eligible for this event.");
        }

        const available = await isHostAvailable(preferredHostId, start, end, {
            ignoreWeeklySchedule: event.bookingMode === "FIXED_SLOTS",
            eventId: allowSharedSessionOverlap ? event.id : undefined,
            scheduleSlotId: allowSharedSessionOverlap ? matchedScheduleSlotId ?? null : undefined,
            tx,
        });

        if (!available) {
            throw new ErrorHandler(StatusCodes.CONFLICT, "The selected host is not available at this time.");
        }

        return {
            assignedHostId: preferredHostId,
            meetingJoinUrl: host.hostUser.zoomIsvLink ?? null,
        };
    }

    const strategyImplementation = getAssignmentStrategy(event.assignmentStrategy);
    const context: AssignmentContext = {
        prisma: tx,
        eventId: event.id,
        start,
        end,
        bookingMode: event.bookingMode,
        allowSharedSessionOverlap,
        matchedScheduleSlotId,
    };

    const result = await strategyImplementation.resolveHost(activeHosts, context);

    if (!result.assignedHostId) {
        throw new ErrorHandler(StatusCodes.CONFLICT, "No available hosts found for the requested time slot.");
    }

    return {
        assignedHostId: result.assignedHostId,
        meetingJoinUrl: result.meetingJoinUrl,
    };
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

    const start = parseBookingStartTime(startTime);
    const event = await getBookableEvent(teamId, eventId);
    const end = new Date(start.getTime() + event.durationSeconds * 1000);
    const schedulingContext = buildSchedulingContext(event);

    assertBookingWeekdayAllowed(
        schedulingContext.allowedWeekdays,
        start,
    );
    assertBookingNoticeSatisfied(
        schedulingContext.minimumNoticeMinutes,
        start,
    );

    const matchedScheduleSlot = await resolveMatchingScheduleSlot(event.id, start);
    const allowSharedSessionOverlap = event.bookingMode === "FIXED_SLOTS";

    if (allowSharedSessionOverlap && !matchedScheduleSlot) {
        throw new ErrorHandler(
            StatusCodes.CONFLICT,
            "The requested time does not match any predefined slot for this event.",
        );
    }
    const activeHosts = event.hosts as HostCandidate[];

    if (activeHosts.length === 0) {
        throw new ErrorHandler(StatusCodes.SERVICE_UNAVAILABLE, "No active hosts available for this event.");
    }

    // 3. Create Booking (Assignment happens inside transaction for concurrency safety)
    return (prisma.$transaction(async (tx) => {
        const { assignedHostId, meetingJoinUrl } = await resolveAssignedHost({
            preferredHostId,
            activeHosts,
            event,
            start,
            end,
            allowSharedSessionOverlap,
            matchedScheduleSlotId: matchedScheduleSlot?.id,
            tx,
        });

        const scheduleSlot = matchedScheduleSlot ?? (await resolveMatchingScheduleSlot(
            event.id,
            start,
        )) as any;

        const { maxParticipants } = getEffectiveParticipantPolicy(
            schedulingContext,
            scheduleSlot ?? (schedulingContext.interactionType as any),
        );

        const currentParticipantCount = await countActiveParticipantsForTime(
            tx,
            eventId,
            start,
        );

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

        return createBookingRecord(tx, {
            studentId: student.id,
            scheduleSlotId: scheduleSlot?.id ?? null,
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
        });
    })) as any;
};

const getBooking = async (id: string) => {
    return findBookingById(id);
};

const listBookings = async (filters: ListBookingsFilters) => {
    return findBookings(filters);
};

const updateBookingStatus = async (id: string, status: BookingStatus) => {
    return updateBookingStatusById(id, status);
};

export {
    createBooking,
    getBooking,
    listBookings,
    updateBookingStatus
};

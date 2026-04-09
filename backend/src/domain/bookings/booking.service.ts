import { BookingStatus } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
    assertBookingNoticeSatisfied,
    assertBookingWeekdayAllowed,
    assertParticipantCapacityAvailable,
    getEffectiveParticipantPolicy,
    resolveMatchingScheduleSlot,
} from "../events/eventScheduling.service";
import {
    countBookings,
    countActiveParticipantsForTime,
    createBookingRecord,
    findBookableEvent,
    findBookingById,
    findBookings,
    updateBookingById,
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
import {
    resolveBookingHostSelection,
} from "./bookingAssignmentResolver.service";
import type { HostCandidate } from "./assignment.service";

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

const resolveBookingWindow = (event: BookableEvent, start: Date) => {
    const end = new Date(start.getTime() + event.durationSeconds * 1000);
    const schedulingContext = buildSchedulingContext(event);

    assertBookingWeekdayAllowed(schedulingContext.allowedWeekdays, start);
    assertBookingNoticeSatisfied(schedulingContext.minimumNoticeMinutes, start);

    return { end, schedulingContext };
};

const resolveSlotContext = async (event: BookableEvent, start: Date) => {
    const matchedScheduleSlot = await resolveMatchingScheduleSlot(event.id, start);
    const allowSharedSessionOverlap = event.bookingMode === "FIXED_SLOTS";

    if (allowSharedSessionOverlap && !matchedScheduleSlot) {
        throw new ErrorHandler(
            StatusCodes.CONFLICT,
            "The requested time does not match any predefined slot for this event.",
        );
    }

    return { matchedScheduleSlot, allowSharedSessionOverlap };
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
    const { end, schedulingContext } = resolveBookingWindow(event, start);
    const { matchedScheduleSlot, allowSharedSessionOverlap } = await resolveSlotContext(event, start);
    const activeHosts = event.hosts as HostCandidate[];

    if (activeHosts.length === 0) {
        throw new ErrorHandler(StatusCodes.SERVICE_UNAVAILABLE, "No active hosts available for this event.");
    }

    // 3. Create Booking (Assignment happens inside transaction for concurrency safety)
    return (prisma.$transaction(async (tx) => {
        const { assignedHostId, meetingJoinUrl, coHostUserIds } = await resolveBookingHostSelection({
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
            coHostUserIds,
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
    const [bookings, totalCount] = await Promise.all([
        findBookings(filters),
        countBookings(filters),
    ]);
    return { bookings, totalCount };
};

const updateBooking = async (
    id: string,
    data: { status?: BookingStatus; coHostUserIds?: string[] }
) => {
    return updateBookingById(id, data);
};

export {
    createBooking,
    getBooking,
    listBookings,
    updateBooking
};

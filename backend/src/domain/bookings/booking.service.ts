import { BookingStatus, Prisma, SessionLeadershipStrategy } from "@prisma/client";
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
    countBookings,
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
}): Promise<{ assignedHostId: string; meetingJoinUrl: string | null; coHostUserIds: string[] }> => {
    // 1. Handle Co-hosting Strategy
    const leadershipStrategy = event.sessionLeadershipStrategy;

    if (leadershipStrategy === SessionLeadershipStrategy.SINGLE_HOST) {
        // Traditional single-host logic
        if (preferredHostId) {
            const host = activeHosts.find((h) => h.hostUserId === preferredHostId);
            if (!host) throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Specified coach is not eligible.");

            const available = await isHostAvailable(preferredHostId, start, end, {
                ignoreWeeklySchedule: event.bookingMode === "FIXED_SLOTS",
                eventId: allowSharedSessionOverlap ? event.id : undefined,
                scheduleSlotId: allowSharedSessionOverlap ? matchedScheduleSlotId ?? null : undefined,
                tx,
            });

            if (!available) throw new ErrorHandler(StatusCodes.CONFLICT, "Coach is not available.");

            return { assignedHostId: preferredHostId, meetingJoinUrl: host.hostUser.zoomIsvLink ?? null, coHostUserIds: [] };
        }

        const strategyImplementation = getAssignmentStrategy(event.assignmentStrategy);
        const context: AssignmentContext = { prisma: tx, eventId: event.id, start, end, bookingMode: event.bookingMode, allowSharedSessionOverlap, matchedScheduleSlotId };
        const result = await strategyImplementation.resolveHost(activeHosts, context);
        if (!result.assignedHostId) throw new ErrorHandler(StatusCodes.CONFLICT, "No available coaches found.");

        return { assignedHostId: result.assignedHostId, meetingJoinUrl: result.meetingJoinUrl, coHostUserIds: [] };
    }

    // 2. Collaborative Sessions (FIXED_LEAD or ROTATING_LEAD)
    let leadHostId: string | undefined;
    let meetingUrl: string | null = null;

    if (leadershipStrategy === SessionLeadershipStrategy.FIXED_LEAD) {
        leadHostId = event.fixedLeadHostId ?? undefined;
        if (!leadHostId) throw new ErrorHandler(StatusCodes.INTERNAL_SERVER_ERROR, "Event configured for FIXED_LEAD but no lead coach is set.");

        const host = activeHosts.find((h) => h.hostUserId === leadHostId);
        if (!host) throw new ErrorHandler(StatusCodes.BAD_REQUEST, "The fixed lead coach is no longer eligible for this event.");
        meetingUrl = host.hostUser.zoomIsvLink ?? null;
    } else {
        // ROTATING_LEAD: used the standard assignment strategy to pick the lead
        const strategyImplementation = getAssignmentStrategy(event.assignmentStrategy);
        const context: AssignmentContext = { prisma: tx, eventId: event.id, start, end, bookingMode: event.bookingMode, allowSharedSessionOverlap, matchedScheduleSlotId };
        const result = await strategyImplementation.resolveHost(activeHosts, context);
        leadHostId = result.assignedHostId;
        meetingUrl = result.meetingJoinUrl;
    }

    if (!leadHostId) {
        throw new ErrorHandler(StatusCodes.CONFLICT, "Could not resolve a lead coach for this collaborative session.");
    }

    // All available coaches in the roster (except the lead) become co-hosts
    const potentialCoHosts = activeHosts.filter((h) => h.hostUserId !== leadHostId);
    const coHostUserIds: string[] = [];

    for (const h of potentialCoHosts) {
        const available = await isHostAvailable(h.hostUserId, start, end, {
            ignoreWeeklySchedule: event.bookingMode === "FIXED_SLOTS",
            eventId: allowSharedSessionOverlap ? event.id : undefined,
            scheduleSlotId: allowSharedSessionOverlap ? matchedScheduleSlotId ?? null : undefined,
            tx,
        });
        if (available) {
            coHostUserIds.push(h.hostUserId);
        }
    }

    return {
        assignedHostId: leadHostId,
        meetingJoinUrl: meetingUrl,
        coHostUserIds,
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
        const { assignedHostId, meetingJoinUrl, coHostUserIds } = await resolveAssignedHost({
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

const updateBookingStatus = async (id: string, status: BookingStatus) => {
    return updateBookingStatusById(id, status);
};

export {
    createBooking,
    getBooking,
    listBookings,
    updateBookingStatus
};

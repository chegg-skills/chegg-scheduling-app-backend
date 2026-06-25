import { AssignmentStrategy, EventBookingMode, Prisma, type EventScheduleSlot, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { addWeeks, addMonths, addDays } from "date-fns";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  getManagedEvent,
  type CreateEventInput,
  type SafeEvent,
  type UpdateEventInput,
  type UpsertEventScheduleSlotInput,
} from "./event.shared";
import { bookingInclude, getMeetingJoinUrl } from "../bookings/booking.shared";
import { EventScheduleSlotSchema } from "./event.schema";
import { generateRecurrenceDates } from "./recurrence.service";
import {
  queueBookingStatusNotifications,
  notifyPoolOfSlotCancellation,
  queueSlotRescheduledNotifications,
} from "../bookings/booking.notification";
import { queueCoachRevealNotifications } from "./coachReveal.notification";
import { getCoachConflicts } from "../availability/availabilityConflict.service";
import { logger } from "../../shared/logging/logger";
import { getRequestLogger } from "../../shared/logging/requestContext";
import { BookingStatus } from "@prisma/client";

type EventScheduleSlotWithBookingCount = Prisma.EventScheduleSlotGetPayload<{
  include: {
    assignedCoach: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        avatarUrl: true;
        email: true;
      };
    };
    _count: {
      select: {
        bookings: true;
      };
    };
    sessionLog: {
      select: {
        id: true;
      };
    };
    recurrenceGroup: {
      select: {
        id: true;
        frequency: true;
        isContinuous: true;
        isActive: true;
      };
    };
  };
}>;

const resolveEventSchedulingConfig = (
  payload: CreateEventInput | UpdateEventInput,
  existing?: SafeEvent,
) => {
  const interactionType = (payload.interactionType ??
    existing?.interactionType) as InteractionType | null;

  const caps = interactionType ? INTERACTION_TYPE_CAPS[interactionType] : null;

  const config = {
    bookingMode:
      (payload.bookingMode as EventBookingMode) ??
      existing?.bookingMode ??
      EventBookingMode.COACH_AVAILABILITY,
    minimumNoticeMinutes: payload.minimumNoticeMinutes ?? existing?.minimumNoticeMinutes ?? 0,
    maxParticipantCount: payload.maxParticipantCount ?? existing?.maxParticipantCount ?? null,
    bufferAfterMinutes: payload.bufferAfterMinutes ?? existing?.bufferAfterMinutes ?? 0,
  };

  // Enforce single-participant rule for OTO / MTO interaction types
  if (caps && !caps.multipleParticipants) {
    config.maxParticipantCount = 1;
  }

  // Enforce Fixed-Slot mode for all group session interaction types (ONE_TO_MANY / MANY_TO_MANY)
  if (caps && caps.multipleParticipants) {
    config.bookingMode = EventBookingMode.FIXED_SLOTS;
  }

  return config;
};

const assertBookingNoticeSatisfied = (minimumNoticeMinutes: number, bookingStartTime: Date) => {
  const now = new Date();
  const noticeMs = minimumNoticeMinutes * 60 * 1000;
  if (bookingStartTime.getTime() - now.getTime() < noticeMs) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Booking does not satisfy the minimum notice requirement.",
    );
  }
};

const getEffectiveParticipantPolicy = (
  event: {
    interactionType: InteractionType;
    bookingMode: EventBookingMode;
    maxParticipantCount: number | null;
  },
  slot?: { capacity?: number | null } | null,
) => {
  const caps = INTERACTION_TYPE_CAPS[event.interactionType];

  if (!caps.multipleParticipants) {
    return { maxParticipants: 1 };
  }

  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    return { maxParticipants: slot?.capacity ?? event.maxParticipantCount ?? null };
  }
  return { maxParticipants: event.maxParticipantCount ?? null };
};

const assertParticipantCapacityAvailable = (
  maxParticipants: number | null,
  currentParticipantCount: number,
) => {
  if (maxParticipants !== null && currentParticipantCount >= maxParticipants) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "This slot has reached its maximum participant capacity.",
    );
  }
};

const resolveMatchingScheduleSlot = async (
  eventId: string,
  startTime: Date,
  tx?: Prisma.TransactionClient,
): Promise<EventScheduleSlot | null> => {
  const client = tx ?? prisma;
  return client.eventScheduleSlot.findFirst({
    where: {
      eventId,
      startTime,
      isActive: true,
    },
  });
};

const listEventScheduleSlots = async (
  eventId: string,
  caller: CallerContext,
): Promise<{ slots: EventScheduleSlotWithBookingCount[] }> => {
  await getManagedEvent(eventId, caller, { allowCoachMember: true });

  // Replenish continuous slots before querying
  await replenishContinuousSlots(eventId);

  const slots = await prisma.eventScheduleSlot.findMany({
    where: { eventId },
    include: {
      assignedCoach: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          email: true,
        },
      },
      _count: {
        select: {
          bookings: {
            where: { status: { not: "CANCELLED" } },
          },
        },
      },
      sessionLog: {
        select: {
          id: true,
        },
      },
      recurrenceGroup: {
        select: {
          id: true,
          frequency: true,
          isContinuous: true,
          isActive: true,
        },
      },
    },
    orderBy: { startTime: "asc" },
  });
  return { slots };
};

/**
 * Picks the next coach for one slot via round-robin and advances the rotation cursor.
 * Runs its own transaction with SELECT FOR UPDATE to prevent concurrent races.
 */
const resolveRoundRobinSlotAssignment = async (
  eventId: string,
  teamId: string,
  coaches: { coachUserId: string; coachOrder: number }[],
): Promise<string> => {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ nextCoachOrder: number }[]>`
      SELECT "nextCoachOrder" FROM "EventRoutingState"
      WHERE "eventId" = ${eventId}
      FOR UPDATE
    `;
    const cursor = Number(rows[0]?.nextCoachOrder ?? 1);

    // Count active assigned slots per coach across the whole team.
    // One slot = one session regardless of how many students attend, so this
    // correctly measures group-session workload without attendance distortion.
    const slotCounts = await tx.eventScheduleSlot.groupBy({
      by: ["assignedCoachId"],
      where: {
        event: { teamId },
        assignedCoachId: { in: coaches.map((c) => c.coachUserId) },
        isActive: true,
        isCancelled: false,
      },
      _count: { assignedCoachId: true },
    });
    const countMap = new Map(
      slotCounts.map((r) => [r.assignedCoachId as string, r._count.assignedCoachId]),
    );

    const maxOrder = Math.max(...coaches.map((c) => c.coachOrder));
    const sorted = [...coaches].sort((a, b) => {
      const countDiff = (countMap.get(a.coachUserId) ?? 0) - (countMap.get(b.coachUserId) ?? 0);
      if (countDiff !== 0) return countDiff;
      const aRot = a.coachOrder >= cursor ? a.coachOrder : a.coachOrder + maxOrder;
      const bRot = b.coachOrder >= cursor ? b.coachOrder : b.coachOrder + maxOrder;
      return aRot - bRot;
    });

    const picked = sorted[0];
    const nextCursor = (picked.coachOrder % maxOrder) + 1;
    await tx.eventRoutingState.upsert({
      where: { eventId },
      create: { eventId, nextCoachOrder: nextCursor },
      update: { nextCoachOrder: nextCursor },
    });
    return picked.coachUserId;
  });
};

/**
 * Assigns coaches to N slots in sequence, advancing the rotation cursor N times atomically.
 * Uses team-wide assigned slot counts as the primary sort key (fewest sessions first) with
 * the rotation cursor as a tiebreaker. A virtual count is tracked within the batch so each
 * slot in the series also distributes fairly without waiting for students to book.
 * Must run inside an existing transaction.
 */
const resolveRoundRobinSequence = async (
  tx: Prisma.TransactionClient,
  eventId: string,
  teamId: string,
  coaches: { coachUserId: string; coachOrder: number }[],
  count: number,
): Promise<string[]> => {
  const rows = await tx.$queryRaw<{ nextCoachOrder: number }[]>`
    SELECT "nextCoachOrder" FROM "EventRoutingState"
    WHERE "eventId" = ${eventId}
    FOR UPDATE
  `;
  let cursor = Number(rows[0]?.nextCoachOrder ?? 1);

  const slotCounts = await tx.eventScheduleSlot.groupBy({
    by: ["assignedCoachId"],
    where: {
      event: { teamId },
      assignedCoachId: { in: coaches.map((c) => c.coachUserId) },
      isActive: true,
      isCancelled: false,
    },
    _count: { assignedCoachId: true },
  });
  const countMap = new Map(
    slotCounts.map((r) => [r.assignedCoachId as string, r._count.assignedCoachId]),
  );

  // Virtual counts track assignments made within this batch so the series itself
  // distributes fairly before any students book.
  const virtualCounts = new Map(coaches.map((c) => [c.coachUserId, countMap.get(c.coachUserId) ?? 0]));
  const maxOrder = Math.max(...coaches.map((c) => c.coachOrder));

  const assignments: string[] = [];
  for (let i = 0; i < count; i++) {
    const sorted = [...coaches].sort((a, b) => {
      const countDiff = (virtualCounts.get(a.coachUserId) ?? 0) - (virtualCounts.get(b.coachUserId) ?? 0);
      if (countDiff !== 0) return countDiff;
      const aRot = a.coachOrder >= cursor ? a.coachOrder : a.coachOrder + maxOrder;
      const bRot = b.coachOrder >= cursor ? b.coachOrder : b.coachOrder + maxOrder;
      return aRot - bRot;
    });
    const picked = sorted[0];
    assignments.push(picked.coachUserId);
    virtualCounts.set(picked.coachUserId, (virtualCounts.get(picked.coachUserId) ?? 0) + 1);
    cursor = (picked.coachOrder % maxOrder) + 1;
  }

  await tx.eventRoutingState.upsert({
    where: { eventId },
    create: { eventId, nextCoachOrder: cursor },
    update: { nextCoachOrder: cursor },
  });

  return assignments;
};

const createEventScheduleSlot = async (
  eventId: string,
  payload: UpsertEventScheduleSlotInput,
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  const event = await getManagedEvent(eventId, caller);

  const validated = EventScheduleSlotSchema.body.parse(payload);
  const caps = INTERACTION_TYPE_CAPS[event.interactionType as InteractionType];
  const isRoundRobinGroup =
    event.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN && caps?.multipleParticipants === true;

  if (validated.recurrence) {
    // Create RecurrenceGroup in DB
    const group = await prisma.recurrenceGroup.create({
      data: {
        eventId,
        frequency: validated.recurrence.frequency,
        isContinuous: validated.recurrence.isContinuous ?? false,
        isActive: true,
        recurrenceVisibilityLimit: validated.recurrence.recurrenceVisibilityLimit ?? null,
      },
    });
    const recurrenceGroupId = group.id;

    const occurrences = validated.recurrence.isContinuous
      ? 12
      : (validated.recurrence.occurrences ?? 1);

    const startDates = generateRecurrenceDates(validated.startTime, {
      frequency: validated.recurrence.frequency,
      occurrences,
    });
    const durationMs = validated.endTime.getTime() - validated.startTime.getTime();

    const firstSlot = await prisma.$transaction(async (tx) => {
      let coachAssignments: (string | null)[];
      // Round-robin is the source of truth for a series: rotate across coaches and
      // ignore any supplied override, which would otherwise pin every slot to one coach.
      if (isRoundRobinGroup && event.coaches.length > 0) {
        coachAssignments = await resolveRoundRobinSequence(tx, eventId, event.teamId, event.coaches, startDates.length);
      } else {
        coachAssignments = startDates.map(() => validated.assignedCoachId ?? null);
      }

      const slotsData = startDates.map((startTime, i) => ({
        eventId,
        startTime,
        endTime: new Date(startTime.getTime() + durationMs),
        capacity: validated.capacity,
        assignedCoachId: coachAssignments[i],
        isActive: validated.isActive,
        recurrenceGroupId,
      }));

      await tx.eventScheduleSlot.createMany({ data: slotsData, skipDuplicates: true });

      return tx.eventScheduleSlot.findFirstOrThrow({
        where: { eventId, startTime: validated.startTime },
        include: {
          assignedCoach: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
          },
        },
      });
    });

    getRequestLogger().info({ eventId, slotCount: startDates.length, recurrenceGroupId, createdBy: caller.id }, "Recurring schedule slots created.");
    return firstSlot;
  }

  const existingSlot = await resolveMatchingScheduleSlot(eventId, validated.startTime);
  if (existingSlot) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "A session already exists at this time for this event.",
    );
  }

  let assignedCoachId: string | null = validated.assignedCoachId ?? null;
  if (isRoundRobinGroup && !assignedCoachId && event.coaches.length > 0) {
    assignedCoachId = await resolveRoundRobinSlotAssignment(eventId, event.teamId, event.coaches);
  }

  const newSlot = await prisma.eventScheduleSlot.create({
    data: {
      eventId,
      startTime: validated.startTime,
      endTime: validated.endTime,
      capacity: validated.capacity,
      assignedCoachId,
      isActive: validated.isActive,
      recurrenceGroupId: null,
    },
    include: {
      assignedCoach: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
      },
    },
  });

  getRequestLogger().info({ eventId, slotId: newSlot.id, startTime: newSlot.startTime, createdBy: caller.id }, "Schedule slot created.");

  return newSlot;
};

const updateEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  payload: UpsertEventScheduleSlotInput,
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  const event = await getManagedEvent(eventId, caller);
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
    include: {
      sessionLog: { select: { id: true } },
      assignedCoach: { select: { id: true, email: true, timezone: true } },
    },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  // Use partial schema for updates to avoid refinement issues
  const validated = EventScheduleSlotSchema.partial.parse(payload);

  // Guard: block rescheduling a slot that has already started
  if (validated.startTime !== undefined && new Date(slot.startTime) <= new Date()) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Cannot reschedule a session that has already started.",
    );
  }

  // Guard: block capacity reduction below current active booking count
  if (validated.capacity !== undefined && validated.capacity !== null) {
    const activeBookingCount = await prisma.booking.count({
      where: { scheduleSlotId: slotId, status: { not: "CANCELLED" } },
    });
    if (validated.capacity < activeBookingCount) {
      throw new ErrorHandler(
        StatusCodes.CONFLICT,
        `Cannot reduce capacity below the current number of active bookings (${activeBookingCount}).`,
      );
    }
  }

  // Detect field changes that affect booked students
  const timeChanged =
    (validated.startTime !== undefined && String(validated.startTime) !== String(slot.startTime)) ||
    (validated.endTime !== undefined && String(validated.endTime) !== String(slot.endTime));
  const coachChanged =
    validated.assignedCoachId !== undefined &&
    validated.assignedCoachId !== slot.assignedCoachId;

  // Remove recurrence if it exists, since it is not part of the EventScheduleSlot model
  delete (validated as any).recurrence;

  const updated = await prisma.eventScheduleSlot.update({
    where: { id: slotId },
    data: validated,
    include: {
      assignedCoach: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
      },
    },
  });

  getRequestLogger().info({ eventId, slotId, updatedBy: caller.id }, "Schedule slot updated.");

  // Cascade time/coach changes to active bookings and notify affected students
  if (timeChanged || coachChanged) {
    const activeBookingCount = await prisma.booking.count({
      where: { scheduleSlotId: slotId, status: { not: "CANCELLED" } },
    });

    if (activeBookingCount > 0) {
      const cascadeData: Record<string, unknown> = {};
      if (timeChanged) {
        if (validated.startTime) cascadeData.startTime = validated.startTime;
        if (validated.endTime) cascadeData.endTime = validated.endTime;
      }
      // Only cascade coach to bookings if the coach was already revealed to students
      if (coachChanged && slot.coachRevealSentAt !== null) {
        cascadeData.coachUserId = validated.assignedCoachId ?? null;
      }

      if (Object.keys(cascadeData).length > 0) {
        await prisma.booking.updateMany({
          where: { scheduleSlotId: slotId, status: { not: "CANCELLED" } },
          data: cascadeData,
        });
      }

      try {
        await queueSlotRescheduledNotifications(slotId, {
          isAnonymous: event.allowAnonymousBooking,
          coachRevealSentAt: slot.coachRevealSentAt,
          assignedCoach: updated.assignedCoach
            ? { id: updated.assignedCoach.id, email: updated.assignedCoach.email, timezone: null }
            : null,
        });
      } catch (error) {
        logger.error({ slotId, error }, "Failed to queue slot rescheduled notifications.");
      }
    }
  }

  return updated;
};

const deleteEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  await getManagedEvent(eventId, caller);
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  const bookingCount = await prisma.booking.count({
    where: { scheduleSlotId: slotId, status: { not: "CANCELLED" } },
  });

  if (bookingCount > 0) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Cannot delete a schedule slot that has active booking(s). Please request student cancellations first.",
    );
  }

  const deleted = await prisma.eventScheduleSlot.delete({ where: { id: slotId } });
  
  if (deleted.recurrenceGroupId) {
    const remainingSlotsCount = await prisma.eventScheduleSlot.count({
      where: { recurrenceGroupId: deleted.recurrenceGroupId },
    });
    if (remainingSlotsCount === 0) {
      await prisma.recurrenceGroup.deleteMany({
        where: { id: deleted.recurrenceGroupId },
      });
    }
  }

  getRequestLogger().warn({ eventId, slotId, deletedBy: caller.id }, "Schedule slot deleted.");
  return deleted;
};

const listSlotBookings = async (eventId: string, slotId: string, caller: CallerContext) => {
  await getManagedEvent(eventId, caller, { allowCoachMember: true });
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  return prisma.booking.findMany({
    where: { scheduleSlotId: slotId },
    include: {
      student: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const cancelEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  const event = await getManagedEvent(eventId, caller);

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
    include: { sessionLog: { select: { id: true } } },
  });

  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  if (slot.isCancelled) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Schedule slot is already cancelled.");
  }

  if (slot.sessionLog) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "Cannot cancel a session that has already been logged.",
    );
  }

  // Use a transaction to update slot and bookings
  const updatedSlot = await prisma.$transaction(async (tx) => {
    // 1. Mark slot as cancelled and inactive
    const s = await tx.eventScheduleSlot.update({
      where: { id: slotId },
      data: { isCancelled: true, isActive: false },
    });

    // 2. Cancel all active bookings
    await tx.booking.updateMany({
      where: {
        scheduleSlotId: slotId,
        status: { in: ["CONFIRMED", "PENDING"] },
      },
      data: { status: "CANCELLED" },
    });

    return s;
  });

  getRequestLogger().warn({ eventId, slotId, cancelledBy: caller.id }, "Schedule slot cancelled.");

  // 3. Trigger notifications (outside transaction for reliability)
  try {
    const cancelledBookings = await prisma.booking.findMany({
      where: {
        scheduleSlotId: slotId,
        status: "CANCELLED",
      },
      include: bookingInclude,
    });

    for (const booking of cancelledBookings) {
      await queueBookingStatusNotifications(booking, { slotRevealedAt: slot.coachRevealSentAt });
    }
    if (event.allowAnonymousBooking) {
      await notifyPoolOfSlotCancellation(slotId, eventId, slot.startTime);
    }
  } catch (error) {
    // Log but don't fail the cancellation if notifications fail
    logger.error({ slotId, error }, "Failed to queue notifications for cancelled slot.");
  }

  return updatedSlot;
};

const revealCoachForSlot = async (
  eventId: string,
  slotId: string,
  payload: { coachUserId?: string; sessionJoinUrl?: string | null },
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  const event = await getManagedEvent(eventId, caller, {
    allowCoachMember: caller.role === UserRole.COACH,
  });

  if (!event.deferCoachReveal) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "This event does not use deferred coach reveal.",
    );
  }

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId, eventId },
    include: {
      bookings: {
        where: { status: { notIn: [BookingStatus.CANCELLED] } },
        select: { studentEmail: true, studentName: true, timezone: true },
      },
    },
  });

  if (!slot) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found.");
  }
  if (slot.coachRevealSentAt) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "Reveal has already been sent for this slot.");
  }
  if (slot.isCancelled) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Cannot send reveal for a cancelled slot.");
  }

  const finalCoachId = payload.coachUserId ?? slot.assignedCoachId;
  if (!finalCoachId) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "No coach assigned. Assign a coach before sending the reveal.",
    );
  }

  if (caller.role === UserRole.COACH && finalCoachId !== caller.id) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "Coaches may only reveal themselves for a slot.");
  }

  const coachInPool = event.coaches.some((ec) => ec.coachUserId === finalCoachId);
  if (!coachInPool) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Selected coach is not in this event's coach pool.",
    );
  }

  const coach = await prisma.user.findUnique({
    where: { id: finalCoachId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      timezone: true,
      zoomIsvLink: true,
    },
  });
  if (!coach || !coach.email) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Coach not found.");
  }

  const finalJoinUrl =
    payload.sessionJoinUrl !== undefined
      ? payload.sessionJoinUrl
      : (slot.sessionJoinUrl ?? getMeetingJoinUrl(event, coach.zoomIsvLink) ?? "");

  const [updatedSlot] = await prisma.$transaction([
    prisma.eventScheduleSlot.update({
      where: { id: slotId },
      data: {
        assignedCoachId: finalCoachId,
        sessionJoinUrl: finalJoinUrl || null,
        coachRevealSentAt: new Date(),
      },
    }),
    // Keep booking records in sync so cancellation notifications reference the revealed coach
    prisma.booking.updateMany({
      where: { scheduleSlotId: slotId, status: { notIn: [BookingStatus.CANCELLED] } },
      data: { coachUserId: finalCoachId },
    }),
  ]);

  getRequestLogger().info({ eventId, slotId, coachUserId: finalCoachId, participantCount: slot.bookings.length, revealedBy: caller.id }, "Coach revealed for slot.");

  void queueCoachRevealNotifications({
    slot: updatedSlot,
    event: { name: event.name, locationValue: event.locationValue },
    coach: {
      id: coach.id,
      email: coach.email,
      firstName: coach.firstName,
      lastName: coach.lastName,
      timezone: coach.timezone,
    },
    participants: slot.bookings,
    joinUrl: finalJoinUrl || "",
  });

  return updatedSlot;
};

const getCoachAvailabilityForSlot = async (
  eventId: string,
  slotId: string,
  caller: CallerContext,
) => {
  const event = await getManagedEvent(eventId, caller, {
    allowCoachMember: caller.role === UserRole.COACH,
  });

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId, eventId },
    select: { startTime: true, endTime: true },
  });
  if (!slot) throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found.");

  const results = await Promise.all(
    event.coaches.map(async (ec) => {
      const conflicts = await getCoachConflicts(ec.coachUserId, slot.startTime, slot.endTime, {
        scheduleSlotId: slotId,
      });
      return {
        coachUserId: ec.coachUserId,
        coachUser: ec.coachUser,
        isAvailable: conflicts.length === 0,
        conflicts: conflicts.map((c) => ({
          eventName: c.event.name,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      };
    }),
  );

  return results.sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
};

const getCoachAvailabilityForProposedSlot = async (
  eventId: string,
  startTime: Date,
  endTime: Date,
  excludeSlotId: string | undefined,
  caller: CallerContext,
) => {
  const event = await getManagedEvent(eventId, caller, {
    allowCoachMember: caller.role === UserRole.COACH,
  });

  const results = await Promise.all(
    event.coaches.map(async (ec) => {
      const conflicts = await getCoachConflicts(ec.coachUserId, startTime, endTime, {
        scheduleSlotId: excludeSlotId,
      });
      return {
        coachUserId: ec.coachUserId,
        coachUser: ec.coachUser,
        isAvailable: conflicts.length === 0,
        conflicts: conflicts.map((c) => ({
          eventName: c.event.name,
          startTime: c.startTime,
          endTime: c.endTime,
        })),
      };
    }),
  );

  return results.sort((a, b) => Number(b.isAvailable) - Number(a.isAvailable));
};

const replenishContinuousSlots = async (
  eventId: string,
  tx?: Prisma.TransactionClient,
): Promise<void> => {
  const client = tx ?? prisma;

  try {
    const activeGroups = await client.recurrenceGroup.findMany({
      where: {
        eventId,
        isContinuous: true,
        isActive: true,
      },
      include: {
        slots: {
          orderBy: { startTime: "desc" },
          take: 1,
        },
      },
    });

    const now = new Date();
    const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    for (const group of activeGroups) {
      if (group.slots.length === 0) {
        await client.recurrenceGroup.update({
          where: { id: group.id },
          data: { isActive: false },
        });
        continue;
      }

      const latestSlot = group.slots[0];
      if (latestSlot.startTime >= horizon) {
        continue;
      }

      const durationMs = latestSlot.endTime.getTime() - latestSlot.startTime.getTime();
      const newSlotsData = [];
      let nextStart = new Date(latestSlot.startTime);
      let iterations = 0;

      while (nextStart < horizon && iterations < 100) {
        iterations++;

        switch (group.frequency) {
          case "WEEKLY":
            nextStart = addWeeks(nextStart, 1);
            break;
          case "BI_WEEKLY":
            nextStart = addWeeks(nextStart, 2);
            break;
          case "MONTHLY":
            nextStart = addMonths(nextStart, 1);
            break;
          case "TWICE_A_MONTH":
            nextStart = addDays(nextStart, 14);
            break;
          case "THRICE_A_WEEK":
            const existingCount = await client.eventScheduleSlot.count({
              where: { recurrenceGroupId: group.id },
            });
            const currentIndex = existingCount + newSlotsData.length;
            const diff = currentIndex % 3 === 2 ? 3 : 2;
            nextStart = addDays(nextStart, diff);
            break;
          default:
            nextStart = horizon;
            break;
        }

        if (nextStart >= horizon) {
          break;
        }

        const slotEnd = new Date(nextStart.getTime() + durationMs);

        newSlotsData.push({
          eventId,
          startTime: nextStart,
          endTime: slotEnd,
          capacity: latestSlot.capacity,
          assignedCoachId: latestSlot.assignedCoachId,
          isActive: latestSlot.isActive,
          recurrenceGroupId: group.id,
        });
      }

      if (newSlotsData.length > 0) {
        await client.eventScheduleSlot.createMany({
          data: newSlotsData,
          skipDuplicates: true,
        });
        getRequestLogger().info(
          { eventId, groupId: group.id, count: newSlotsData.length },
          "Replenished continuous recurrence slots."
        );
      }
    }
  } catch (error) {
    logger.error({ eventId, error }, "Failed to replenish continuous slots. Proceeding anyway.");
  }
};

const stopRecurrenceGroup = async (
  eventId: string,
  groupId: string,
  caller: CallerContext,
): Promise<{ message: string }> => {
  await getManagedEvent(eventId, caller);

  const group = await prisma.recurrenceGroup.findFirst({
    where: { id: groupId, eventId },
  });

  if (!group) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Recurrence series not found for this event.");
  }

  await prisma.recurrenceGroup.update({
    where: { id: groupId },
    data: { isActive: false },
  });

  return { message: "Recurrence series stopped successfully." };
};

const resumeRecurrenceGroup = async (
  eventId: string,
  groupId: string,
  caller: CallerContext,
): Promise<{ message: string }> => {
  await getManagedEvent(eventId, caller);

  const group = await prisma.recurrenceGroup.findFirst({
    where: { id: groupId, eventId },
  });

  if (!group) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Recurrence series not found for this event.");
  }

  await prisma.recurrenceGroup.update({
    where: { id: groupId },
    data: { isActive: true },
  });

  // Trigger replenishment immediately
  await replenishContinuousSlots(eventId);

  return { message: "Recurrence series resumed successfully." };
};

export {
  resolveEventSchedulingConfig,
  assertBookingNoticeSatisfied,
  getEffectiveParticipantPolicy,
  assertParticipantCapacityAvailable,
  resolveMatchingScheduleSlot,
  listEventScheduleSlots,
  createEventScheduleSlot,
  updateEventScheduleSlot,
  deleteEventScheduleSlot,
  cancelEventScheduleSlot,
  listSlotBookings,
  revealCoachForSlot,
  getCoachAvailabilityForSlot,
  getCoachAvailabilityForProposedSlot,
  replenishContinuousSlots,
  stopRecurrenceGroup,
  resumeRecurrenceGroup,
};

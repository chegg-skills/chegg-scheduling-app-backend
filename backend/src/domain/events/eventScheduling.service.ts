import { EventBookingMode, Prisma, type EventScheduleSlot, UserRole } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
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
import { bookingInclude } from "../bookings/booking.shared";
import { EventScheduleSlotSchema } from "./event.schema";
import { generateRecurrenceDates } from "./recurrence.service";
import { queueBookingStatusNotifications } from "../bookings/booking.notification";
import { queueCoachRevealNotifications } from "./coachReveal.notification";
import { getCoachConflicts } from "../availability/availabilityConflict.service";
import { logger } from "../../shared/logging/logger";
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
    allowedWeekdays: payload.allowedWeekdays ?? existing?.allowedWeekdays ?? [],
    minimumNoticeMinutes: payload.minimumNoticeMinutes ?? existing?.minimumNoticeMinutes ?? 0,
    minParticipantCount: payload.minParticipantCount ?? existing?.minParticipantCount ?? null,
    maxParticipantCount: payload.maxParticipantCount ?? existing?.maxParticipantCount ?? null,
    bufferAfterMinutes: payload.bufferAfterMinutes ?? existing?.bufferAfterMinutes ?? 0,
    weeklyAvailability: payload.weeklyAvailability ?? existing?.weeklyAvailability ?? [],
  };

  // Enforce single-participant rule for OTO / MTO interaction types
  if (caps && !caps.multipleParticipants) {
    config.minParticipantCount = 1;
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

const assertBookingAvailabilityAllowed = (
  allowedWeekdays: number[],
  weeklyAvailability: any[],
  bookingStartTime: Date,
  bookingEndTime: Date,
) => {
  const day = bookingStartTime.getDay();
  const dayRanges = weeklyAvailability.filter((a) => a.dayOfWeek === day);
  if (dayRanges.length > 0) {
    const startHour = bookingStartTime.getHours();
    const startMin = bookingStartTime.getMinutes();
    const endHour = bookingEndTime.getHours();
    const endMin = bookingEndTime.getMinutes();

    const bookingStartTotalMins = startHour * 60 + startMin;
    const bookingEndTotalMins = endHour * 60 + endMin;

    const isWithinAnyRange = dayRanges.some((range) => {
      const [rangeStartH, rangeStartM] = range.startTime.split(":").map(Number);
      const [rangeEndH, rangeEndM] = range.endTime.split(":").map(Number);
      const rangeStartTotalMins = rangeStartH * 60 + rangeStartM;
      const rangeEndTotalMins = rangeEndH * 60 + rangeEndM;

      return (
        bookingStartTotalMins >= rangeStartTotalMins && bookingEndTotalMins <= rangeEndTotalMins
      );
    });

    if (!isWithinAnyRange) {
      throw new ErrorHandler(
        StatusCodes.BAD_REQUEST,
        "Booking is outside the allowed time range for this day.",
      );
    }
    return;
  }

  // 2. Fallback to allowedWeekdays if no specific ranges are defined
  if (allowedWeekdays.length === 0) return;
  if (!allowedWeekdays.includes(day)) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Booking is not allowed on this day of the week.",
    );
  }
};

const getEffectiveParticipantPolicy = (
  event: {
    interactionType: InteractionType;
    bookingMode: EventBookingMode;
    minParticipantCount: number | null;
    maxParticipantCount: number | null;
  },
  slot?: { capacity?: number | null } | null,
) => {
  const caps = INTERACTION_TYPE_CAPS[event.interactionType];

  if (!caps.multipleParticipants) {
    return {
      minParticipants: 1,
      maxParticipants: 1,
    };
  }

  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    return {
      minParticipants: event.minParticipantCount ?? 1,
      maxParticipants: slot?.capacity ?? event.maxParticipantCount ?? null,
    };
  }
  return {
    minParticipants: event.minParticipantCount ?? 1,
    maxParticipants: event.maxParticipantCount ?? null,
  };
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
    },
    orderBy: { startTime: "asc" },
  });
  return { slots };
};

const assertSlotWithinAvailability = async (
  eventId: string,
  startTime: Date,
  endTime: Date,
  caller: CallerContext,
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { weeklyAvailability: true },
  });

  if (!event) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Event not found.");
  }

  assertBookingAvailabilityAllowed(
    event.allowedWeekdays,
    event.weeklyAvailability,
    startTime,
    endTime,
  );
};

const createEventScheduleSlot = async (
  eventId: string,
  payload: UpsertEventScheduleSlotInput,
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  await getManagedEvent(eventId, caller);

  const validated = EventScheduleSlotSchema.body.parse(payload);

  const recurrenceGroupId = validated.recurrence ? crypto.randomUUID() : null;

  if (validated.recurrence) {
    const startDates = generateRecurrenceDates(validated.startTime, validated.recurrence);
    const durationMs = validated.endTime.getTime() - validated.startTime.getTime();

    // Validate all slots before performing any inserts (All or Nothing)
    for (const startTime of startDates) {
      const endTime = new Date(startTime.getTime() + durationMs);
      await assertSlotWithinAvailability(eventId, startTime, endTime, caller);
    }

    const slotsData = startDates.map((startTime) => ({
      eventId,
      startTime,
      endTime: new Date(startTime.getTime() + durationMs),
      capacity: validated.capacity,
      assignedCoachId: validated.assignedCoachId,
      isActive: validated.isActive,
      recurrenceGroupId,
    }));

    // Perform the creation
    // Note: We use a loop or transaction instead of createMany if we want to return the full objects
    // or if we need to trigger individual hooks. For simplicity and grouping, we'll use createMany.
    await prisma.eventScheduleSlot.createMany({
      data: slotsData,
      skipDuplicates: true, // Safety against overlap with existing slots
    });

    // Return the first instance created
    return prisma.eventScheduleSlot.findFirstOrThrow({
      where: { eventId, startTime: validated.startTime },
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
      },
    });
  }

  await assertSlotWithinAvailability(eventId, validated.startTime, validated.endTime, caller);

  const existingSlot = await resolveMatchingScheduleSlot(eventId, validated.startTime);
  if (existingSlot) {
    throw new ErrorHandler(
      StatusCodes.CONFLICT,
      "A session already exists at this time for this event.",
    );
  }

  return prisma.eventScheduleSlot.create({
    data: {
      eventId,
      startTime: validated.startTime,
      endTime: validated.endTime,
      capacity: validated.capacity,
      assignedCoachId: validated.assignedCoachId,
      isActive: validated.isActive,
      recurrenceGroupId,
    },
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
    },
  });
};

const updateEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  payload: UpsertEventScheduleSlotInput,
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  await getManagedEvent(eventId, caller);
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  // Use partial schema for updates to avoid refinement issues
  const validated = EventScheduleSlotSchema.partial.parse(payload);

  if (validated.startTime || validated.endTime) {
    await assertSlotWithinAvailability(
      eventId,
      validated.startTime ?? slot.startTime,
      validated.endTime ?? slot.endTime,
      caller,
    );
  }

  return prisma.eventScheduleSlot.update({
    where: { id: slotId },
    data: validated,
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
    },
  });
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

  return prisma.eventScheduleSlot.delete({
    where: { id: slotId },
  });
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
  await getManagedEvent(eventId, caller);

  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });

  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  if (slot.isCancelled) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Schedule slot is already cancelled.");
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
      await queueBookingStatusNotifications(booking);
    }
  } catch (error) {
    // Log but don't fail the cancellation if notifications fail
    logger.error("Failed to queue notifications for cancelled slot", { slotId, error });
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
      : (slot.sessionJoinUrl ?? coach.zoomIsvLink ?? event.locationValue ?? "");

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

export {
  resolveEventSchedulingConfig,
  assertBookingNoticeSatisfied,
  assertBookingAvailabilityAllowed,
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
};

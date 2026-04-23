import { EventBookingMode, Prisma, type EventScheduleSlot } from "@prisma/client";
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
import { EventScheduleSlotSchema } from "./event.schema";

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
  await getManagedEvent(eventId, caller);

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

  await assertSlotWithinAvailability(eventId, validated.startTime, validated.endTime, caller);

  return prisma.eventScheduleSlot.create({
    data: {
      eventId,
      startTime: validated.startTime,
      endTime: validated.endTime,
      capacity: validated.capacity,
      assignedCoachId: validated.assignedCoachId,
      isActive: validated.isActive,
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
};

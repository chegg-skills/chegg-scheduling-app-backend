import { EventBookingMode, Prisma, type EventInteractionType as EventInteractionTypeModel, type EventScheduleSlot } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
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
    _count: {
      select: {
        bookings: true;
      };
    };
  };
}>;

const resolveEventSchedulingConfig = (
  payload: CreateEventInput | UpdateEventInput,
  interactionType: EventInteractionTypeModel,
  existing?: SafeEvent,
) => {
  return {
    bookingMode: (payload.bookingMode as EventBookingMode) ?? existing?.bookingMode ?? EventBookingMode.HOST_AVAILABILITY,
    allowedWeekdays: payload.allowedWeekdays ?? existing?.allowedWeekdays ?? [],
    minimumNoticeMinutes:
      payload.minimumNoticeMinutes ?? existing?.minimumNoticeMinutes ?? 0,
    minParticipantCount:
      payload.minParticipantCount ??
      existing?.minParticipantCount ??
      interactionType.minParticipants,
    maxParticipantCount:
      payload.maxParticipantCount ??
      existing?.maxParticipantCount ??
      interactionType.maxParticipants,
    bufferAfterMinutes:
      payload.bufferAfterMinutes ??
      existing?.bufferAfterMinutes ?? 0,
  };
};

const assertBookingNoticeSatisfied = (
  minimumNoticeMinutes: number,
  bookingStartTime: Date,
) => {
  const now = new Date();
  const noticeMs = minimumNoticeMinutes * 60 * 1000;
  if (bookingStartTime.getTime() - now.getTime() < noticeMs) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Booking does not satisfy the minimum notice requirement.",
    );
  }
};

const assertBookingWeekdayAllowed = (
  allowedWeekdays: number[],
  bookingTime: Date,
) => {
  if (allowedWeekdays.length === 0) return;
  const day = bookingTime.getUTCDay();
  if (!allowedWeekdays.includes(day)) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "Booking is not allowed on this day of the week.",
    );
  }
};

const getEffectiveParticipantPolicy = (
  event: {
    bookingMode: EventBookingMode;
    minParticipantCount: number | null;
    maxParticipantCount: number | null;
  },
  slotOrInteraction: {
    minParticipants?: number;
    maxParticipants?: number | null;
    capacity?: number | null;
  },
) => {
  if (event.bookingMode === EventBookingMode.FIXED_SLOTS) {
    return {
      minParticipants: event.minParticipantCount ?? slotOrInteraction.minParticipants ?? 1,
      maxParticipants: slotOrInteraction.capacity ?? event.maxParticipantCount ?? slotOrInteraction.maxParticipants ?? null,
    };
  }
  return {
    minParticipants: slotOrInteraction.minParticipants ?? 1,
    maxParticipants: slotOrInteraction.maxParticipants ?? null,
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

const createEventScheduleSlot = async (
  eventId: string,
  payload: UpsertEventScheduleSlotInput,
  caller: CallerContext,
): Promise<EventScheduleSlot> => {
  await getManagedEvent(eventId, caller);

  const validated = EventScheduleSlotSchema.body.parse(payload);

  return prisma.eventScheduleSlot.create({
    data: {
      eventId,
      startTime: validated.startTime,
      endTime: validated.endTime,
      capacity: validated.capacity,
      isActive: validated.isActive,
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

  return prisma.eventScheduleSlot.update({
    where: { id: slotId },
    data: validated,
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
  assertBookingWeekdayAllowed,
  getEffectiveParticipantPolicy,
  assertParticipantCapacityAvailable,
  resolveMatchingScheduleSlot,
  listEventScheduleSlots,
  createEventScheduleSlot,
  updateEventScheduleSlot,
  deleteEventScheduleSlot,
};

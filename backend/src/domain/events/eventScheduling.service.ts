import { EventBookingMode, type EventInteractionType as EventInteractionTypeModel } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../shared/db/prisma";
import { ErrorHandler } from "../../shared/error/errorhandler";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  getManagedEvent,
  parseNonNegativeInt,
  type CreateEventInput,
  type SafeEvent,
  type UpdateEventInput,
  type UpsertEventScheduleSlotInput,
} from "./event.shared";

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
) => {
  return prisma.eventScheduleSlot.findFirst({
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
): Promise<{ slots: any[] }> => {
  await getManagedEvent(eventId, caller);

  const slots = await prisma.eventScheduleSlot.findMany({
    where: { eventId },
    orderBy: { startTime: "asc" },
  });
  return { slots };
};

const createEventScheduleSlot = async (
  eventId: string,
  payload: UpsertEventScheduleSlotInput,
  caller: CallerContext,
): Promise<any> => {
  await getManagedEvent(eventId, caller);

  return prisma.eventScheduleSlot.create({
    data: {
      eventId,
      startTime: new Date(payload.startTime as string | Date),
      endTime: new Date(payload.endTime as string | Date),
      capacity: payload.capacity !== undefined && payload.capacity !== null
        ? parseNonNegativeInt(payload.capacity, "capacity")
        : null,
      isActive: payload.isActive ?? true,
    },
  });
};

const updateEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  payload: UpsertEventScheduleSlotInput,
  caller: CallerContext,
): Promise<any> => {
  await getManagedEvent(eventId, caller);
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
  }

  const data: Record<string, unknown> = {};
  if (payload.startTime !== undefined) data.startTime = new Date(payload.startTime);
  if (payload.endTime !== undefined) data.endTime = new Date(payload.endTime);
  if (payload.isActive !== undefined) data.isActive = Boolean(payload.isActive);
  if (payload.capacity !== undefined) {
    data.capacity = payload.capacity !== null ? parseNonNegativeInt(payload.capacity, "capacity") : null;
  }

  return prisma.eventScheduleSlot.update({
    where: { id: slotId },
    data,
  });
};

const deleteEventScheduleSlot = async (
  eventId: string,
  slotId: string,
  caller: CallerContext,
): Promise<any> => {
  await getManagedEvent(eventId, caller);
  const slot = await prisma.eventScheduleSlot.findUnique({
    where: { id: slotId },
  });
  if (!slot || slot.eventId !== eventId) {
    throw new ErrorHandler(StatusCodes.NOT_FOUND, "Schedule slot not found for this event.");
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

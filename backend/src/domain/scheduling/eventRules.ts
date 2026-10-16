import { EventBookingMode } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
  INTERACTION_TYPE_CAPS,
  type InteractionType,
} from "../../shared/constants/interactionType";

/**
 * Pure scheduling rules for events: no database, no I/O, no imports from other domains.
 * Keep it that way — these are shared by events, availability and bookings precisely
 * because they depend on nothing (see tests/unit/schedulingRules.architecture.test.ts).
 */

export const assertBookingNoticeSatisfied = (
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

export const assertParticipantCapacityAvailable = (
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

export const getEffectiveParticipantPolicy = (
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

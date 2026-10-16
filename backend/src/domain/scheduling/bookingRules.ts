import { BookingStatus, MeetingLinkSource } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";

/**
 * Pure booking rules (token validity, meeting-link resolution): no database, no I/O,
 * no imports from other domains.
 */

export const assertRescheduleTokenValid = (booking: {
  status: BookingStatus;
  startTime: Date;
  event: { durationSeconds: number };
}): void => {
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "This booking link is no longer valid.");
  }
  const sessionEndMs = new Date(booking.startTime).getTime() + booking.event.durationSeconds * 1000;
  const gracePeriodMs = 2 * 60 * 60 * 1000; // 2 hours after session end
  if (Date.now() > sessionEndMs + gracePeriodMs) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "This session has ended. To book a new session, visit the team's booking page.",
    );
  }
};

export const assertCancelTokenValid = (booking: {
  status: BookingStatus;
  startTime: Date;
}): void => {
  if (booking.status === BookingStatus.CANCELLED) {
    throw new ErrorHandler(StatusCodes.CONFLICT, "This session has already been cancelled.");
  }
  if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
    throw new ErrorHandler(StatusCodes.FORBIDDEN, "This booking link is no longer valid.");
  }
  if (Date.now() >= new Date(booking.startTime).getTime()) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "This session has already started and cannot be cancelled via this link.",
    );
  }
};

/**
 * Resolves the actual meeting destination (a coach's Zoom link or the event's
 * shared location) for internal, non-student-facing use only — the redirect
 * resolver (public.service.ts) and the admin-facing booking detail display.
 * Never pass this value into a student-facing notification; students only ever
 * receive the opaque link from buildStudentJoinUrl / Booking.meetingJoinUrl.
 */
export const getMeetingJoinUrl = (
  event: { meetingLinkSource: MeetingLinkSource; locationValue: string | null },
  coachZoomLink: string | null | undefined,
): string | null => {
  if (event.meetingLinkSource === MeetingLinkSource.EVENT_LOCATION) {
    return event.locationValue || coachZoomLink || null;
  }
  return coachZoomLink || event.locationValue || null;
};

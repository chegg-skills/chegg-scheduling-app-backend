/**
 * Regression test for a dead "Cancel session" link in two confirmation emails.
 * queueBookingCreatedNotifications hand-narrows the student `variables` object for
 * anonymous and deferred-reveal bookings (to keep coach identity out of the payload
 * pre-reveal) but had dropped `cancelUrl` while keeping `rescheduleUrl` — rendering
 * `{{cancelUrl}}` as an empty href in BOOKING_CONFIRMED_ANONYMOUS and
 * BOOKING_CONFIRMED_DEFERRED.
 */
const publishNotificationSafely = jest.fn().mockResolvedValue(true);

jest.mock("../../src/shared/notifications/notification.publisher", () => ({
  publishNotificationSafely: (...args: unknown[]) => publishNotificationSafely(...args),
  resolveFrontendUrl: () => "http://localhost:3000",
}));

const NO_REMINDERS_CONFIG = {
  reminderOffsets: [],
  poolReminderOffsets: [],
  adminNotifyOnBooking: false,
  adminNotifyOnCancellation: false,
  adminNotifyOnNoShow: false,
  coachNotifyOnBooking: false,
  coachNotifyOnCancellation: false,
  coachNotifyOnNoShow: false,
  notifyLeadOnAvailability: false,
  sendFeedbackLink: false,
  feedbackFormLink: null,
};

jest.mock("../../src/shared/notifications/notificationConfig", () => ({
  getTeamNotificationConfig: jest.fn().mockResolvedValue(NO_REMINDERS_CONFIG),
}));

jest.mock("../../src/shared/db/prisma", () => ({
  prisma: {
    user: { findMany: jest.fn().mockResolvedValue([]) },
    teamMember: { findMany: jest.fn().mockResolvedValue([]) },
    booking: { count: jest.fn().mockResolvedValue(0) },
    eventCoach: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

import { queueBookingCreatedNotifications } from "../../src/domain/bookings/booking.notification";

const baseBooking = (overrides: Record<string, unknown> = {}): any => ({
  id: "booking-1",
  eventId: "event-1",
  teamId: "team-1",
  scheduleSlotId: null,
  studentEmail: "student@example.com",
  studentName: "Student One",
  startTime: new Date("2026-07-14T12:00:00.000Z"),
  endTime: new Date("2026-07-14T13:00:00.000Z"),
  timezone: "Asia/Kolkata",
  status: "CONFIRMED",
  meetingJoinUrl: "http://localhost:4000/api/public/bookings/booking-1/join?t=token-1",
  coachUserId: null,
  coCoachUserIds: [],
  rescheduleToken: "token-1",
  coach: null,
  team: { name: "Test Team" },
  ...overrides,
});

describe("queueBookingCreatedNotifications — cancelUrl regression", () => {
  beforeEach(() => {
    publishNotificationSafely.mockClear();
  });

  it("includes a non-empty cancelUrl in the BOOKING_CONFIRMED_ANONYMOUS payload", async () => {
    await queueBookingCreatedNotifications(
      baseBooking({ event: { name: "Test Event", allowAnonymousBooking: true, deferCoachReveal: false } }),
    );

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.type === "BOOKING_CONFIRMED_ANONYMOUS");

    expect(studentCall.variables.cancelUrl).toBeTruthy();
    expect(studentCall.variables.cancelUrl).toContain(`/cancel/booking-1`);
  });

  it("includes a non-empty cancelUrl in the BOOKING_CONFIRMED_DEFERRED payload, without leaking coach details", async () => {
    await queueBookingCreatedNotifications(
      baseBooking({
        coach: { id: "coach-1", email: "coach@example.com", firstName: "Mason", lastName: "Product", timezone: "UTC" },
        coachUserId: "coach-1",
        event: { name: "Test Event", allowAnonymousBooking: false, deferCoachReveal: true },
      }),
      { slotRevealedAt: null },
    );

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.type === "BOOKING_CONFIRMED_DEFERRED");

    expect(studentCall.variables.cancelUrl).toBeTruthy();
    expect(studentCall.variables.cancelUrl).toContain(`/cancel/booking-1`);
    // Masking must still hold: no coach identity or raw join link in the deferred payload.
    expect(studentCall.variables.coachName).toBeUndefined();
    expect(studentCall.variables.meetingJoinUrl).toBeUndefined();
  });
});

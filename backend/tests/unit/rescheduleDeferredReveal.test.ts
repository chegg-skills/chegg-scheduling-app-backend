/**
 * Regression test for a reschedule leaking coach name + join link for events with
 * Defer Coach Reveal enabled. Both the student-initiated reschedule
 * (queueBookingRescheduledNotifications) and the admin-initiated slot time change
 * (queueSlotRescheduledNotifications) must withhold coach/join details from the
 * student until the explicit reveal action has been sent — mirroring how booking
 * creation already handles BOOKING_CONFIRMED_DEFERRED.
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

const bookingFindMany = jest.fn();
jest.mock("../../src/shared/db/prisma", () => ({
  prisma: {
    user: { findMany: jest.fn().mockResolvedValue([]) },
    booking: { findMany: (...args: unknown[]) => bookingFindMany(...args) },
  },
}));

import {
  queueBookingRescheduledNotifications,
  queueSlotRescheduledNotifications,
} from "../../src/domain/bookings/booking.notification";

const baseBooking = (overrides: Record<string, unknown> = {}): any => ({
  id: "booking-1",
  eventId: "event-1",
  teamId: "team-1",
  scheduleSlotId: "slot-1",
  studentEmail: "student@example.com",
  studentName: "Student One",
  startTime: new Date("2026-07-14T12:00:00.000Z"),
  endTime: new Date("2026-07-14T13:00:00.000Z"),
  timezone: "Asia/Kolkata",
  status: "CONFIRMED",
  meetingJoinUrl: "http://localhost:4000/api/public/bookings/booking-1/join?t=token-1",
  coachUserId: "coach-1",
  coCoachUserIds: [],
  rescheduleToken: "token-1",
  coach: {
    id: "coach-1",
    email: "coach@example.com",
    firstName: "Mason",
    lastName: "Product",
    timezone: "America/New_York",
  },
  team: { name: "Test Team" },
  event: { name: "Test Event", deferCoachReveal: true, allowAnonymousBooking: false },
  ...overrides,
});

describe("queueBookingRescheduledNotifications — deferred reveal", () => {
  beforeEach(() => {
    publishNotificationSafely.mockClear();
  });

  it("sends BOOKING_RESCHEDULED_DEFERRED (no coach name, no join link) when reveal has not been sent", async () => {
    await queueBookingRescheduledNotifications(baseBooking(), { slotRevealedAt: null });

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.recipients === "student@example.com");

    expect(studentCall.type).toBe("BOOKING_RESCHEDULED_DEFERRED");
    // Masking must hold at the payload level, not just in what the template renders —
    // coachName/meetingJoinUrl must never reach the outbox row pre-reveal.
    expect(studentCall.variables.coachName).toBeUndefined();
    expect(studentCall.variables.meetingJoinUrl).toBeUndefined();
  });

  it("sends the regular BOOKING_RESCHEDULED (full coach details) once reveal has been sent", async () => {
    await queueBookingRescheduledNotifications(baseBooking(), {
      slotRevealedAt: new Date("2026-07-01T00:00:00.000Z"),
    });

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.recipients === "student@example.com");

    expect(studentCall.type).toBe("BOOKING_RESCHEDULED");
    expect(studentCall.variables.coachName).toBe("Mason Product");
  });

  it("sends the regular BOOKING_RESCHEDULED when the event does not defer coach reveal", async () => {
    await queueBookingRescheduledNotifications(
      baseBooking({ event: { name: "Test Event", deferCoachReveal: false, allowAnonymousBooking: false } }),
      { slotRevealedAt: null },
    );

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.recipients === "student@example.com");

    expect(studentCall.type).toBe("BOOKING_RESCHEDULED");
  });
});

describe("queueSlotRescheduledNotifications — deferred reveal", () => {
  beforeEach(() => {
    publishNotificationSafely.mockClear();
    bookingFindMany.mockReset();
  });

  it("sends SLOT_RESCHEDULED_DEFERRED (no coach name, no join link) when reveal has not been sent", async () => {
    bookingFindMany.mockResolvedValue([baseBooking()]);

    await queueSlotRescheduledNotifications("slot-1", {
      isAnonymous: false,
      deferCoachReveal: true,
      coachRevealSentAt: null,
      assignedCoach: { id: "coach-1", email: "coach@example.com", timezone: "America/New_York" },
    });

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.recipients === "student@example.com");

    expect(studentCall.type).toBe("SLOT_RESCHEDULED_DEFERRED");
    expect(studentCall.variables.coachName).toBeUndefined();
    expect(studentCall.variables.meetingJoinUrl).toBeUndefined();
  });

  it("sends the regular SLOT_RESCHEDULED (full coach details) once reveal has been sent", async () => {
    bookingFindMany.mockResolvedValue([baseBooking()]);

    await queueSlotRescheduledNotifications("slot-1", {
      isAnonymous: false,
      deferCoachReveal: true,
      coachRevealSentAt: new Date("2026-07-01T00:00:00.000Z"),
      assignedCoach: { id: "coach-1", email: "coach@example.com", timezone: "America/New_York" },
    });

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.recipients === "student@example.com");

    expect(studentCall.type).toBe("SLOT_RESCHEDULED");
    expect(studentCall.variables.coachName).toBe("Mason Product");
  });

  it("sends the regular SLOT_RESCHEDULED when the event does not defer coach reveal", async () => {
    bookingFindMany.mockResolvedValue([baseBooking()]);

    await queueSlotRescheduledNotifications("slot-1", {
      isAnonymous: false,
      deferCoachReveal: false,
      coachRevealSentAt: null,
      assignedCoach: { id: "coach-1", email: "coach@example.com", timezone: "America/New_York" },
    });

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.recipients === "student@example.com");

    expect(studentCall.type).toBe("SLOT_RESCHEDULED");
  });

  it("sends SLOT_RESCHEDULED_ANONYMOUS regardless of deferCoachReveal for anonymous bookings", async () => {
    bookingFindMany.mockResolvedValue([baseBooking()]);

    await queueSlotRescheduledNotifications("slot-1", {
      isAnonymous: true,
      deferCoachReveal: true,
      coachRevealSentAt: null,
      assignedCoach: { id: "coach-1", email: "coach@example.com", timezone: "America/New_York" },
    });

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.recipients === "student@example.com");

    expect(studentCall.type).toBe("SLOT_RESCHEDULED_ANONYMOUS");
  });
});

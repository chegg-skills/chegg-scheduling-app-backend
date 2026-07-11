/**
 * Regression test for the coach-reveal student email leaking the coach's raw
 * personal Zoom link. queueCoachRevealNotifications must send each student their
 * own booking's masked meetingJoinUrl, never the raw resolved link — the raw link
 * is only appropriate in the coach's own COACH_BOOKING_ASSIGNED notification.
 */
const publishNotificationSafely = jest.fn().mockResolvedValue(true);

jest.mock("../../src/shared/notifications/notification.publisher", () => ({
  publishNotificationSafely: (...args: unknown[]) => publishNotificationSafely(...args),
  resolveFrontendUrl: () => "http://localhost:3000",
}));

import { queueCoachRevealNotifications } from "../../src/domain/events/coachReveal.notification";

describe("queueCoachRevealNotifications", () => {
  beforeEach(() => {
    publishNotificationSafely.mockClear();
  });

  it("sends each student their own masked booking link, never the coach's raw link", async () => {
    const rawCoachZoomLink = "https://zoom.us/isv/dummy/coach-raw-personal-link";

    await queueCoachRevealNotifications({
      slot: { startTime: new Date("2026-07-14T12:30:00.000Z") } as any,
      event: { name: "Test Event", locationValue: "" },
      coach: {
        id: "coach-1",
        email: "coach@example.com",
        firstName: "Mo",
        lastName: "Kumar",
        timezone: "Asia/Kolkata",
      },
      participants: [
        {
          studentEmail: "student1@example.com",
          studentName: "Student One",
          timezone: "Asia/Kolkata",
          meetingJoinUrl: "http://localhost:4000/api/public/bookings/booking-1/join?t=token-1",
        },
        {
          studentEmail: "student2@example.com",
          studentName: "Student Two",
          timezone: "Asia/Kolkata",
          meetingJoinUrl: "http://localhost:4000/api/public/bookings/booking-2/join?t=token-2",
        },
      ],
      coachRawJoinUrl: rawCoachZoomLink,
    });

    const studentCalls = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .filter((p: any) => p.type === "COACH_REVEAL_SENT");

    expect(studentCalls).toHaveLength(2);

    const student1Call = studentCalls.find((c: any) => c.recipients === "student1@example.com");
    const student2Call = studentCalls.find((c: any) => c.recipients === "student2@example.com");

    // Each student gets their OWN masked booking link, not the shared raw coach link.
    expect(student1Call.variables.meetingJoinUrl).toBe(
      "http://localhost:4000/api/public/bookings/booking-1/join?t=token-1",
    );
    expect(student2Call.variables.meetingJoinUrl).toBe(
      "http://localhost:4000/api/public/bookings/booking-2/join?t=token-2",
    );

    // The raw coach link must never appear in any student-facing notification.
    for (const call of studentCalls) {
      expect(call.variables.meetingJoinUrl).not.toBe(rawCoachZoomLink);
      expect(call.variables.meetingJoinUrl).not.toContain("zoom.us");
    }

    // The coach's own notification correctly gets the raw resolved link.
    const coachCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.type === "COACH_BOOKING_ASSIGNED");

    expect(coachCall.variables.meetingJoinUrl).toBe(rawCoachZoomLink);
  });

  it("falls back to an empty string, never the raw link, when a booking has no meetingJoinUrl", async () => {
    await queueCoachRevealNotifications({
      slot: { startTime: new Date("2026-07-14T12:30:00.000Z") } as any,
      event: { name: "Test Event", locationValue: "" },
      coach: {
        id: "coach-1",
        email: "coach@example.com",
        firstName: "Mo",
        lastName: "Kumar",
        timezone: "Asia/Kolkata",
      },
      participants: [
        {
          studentEmail: "student1@example.com",
          studentName: "Student One",
          timezone: "Asia/Kolkata",
          meetingJoinUrl: null,
        },
      ],
      coachRawJoinUrl: "https://zoom.us/isv/dummy/coach-raw-personal-link",
    });

    const studentCall = publishNotificationSafely.mock.calls
      .map(([payload]: any[]) => payload)
      .find((p: any) => p.type === "COACH_REVEAL_SENT");

    expect(studentCall.variables.meetingJoinUrl).toBe("");
  });
});

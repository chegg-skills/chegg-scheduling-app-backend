import { emailTemplates } from "./registry";

// Every NotificationType that maps to an email template (all except CANCEL_BOOKING_REMINDERS).
// CANCEL_BOOKING_REMINDERS is a control message — the notification service uses it to cancel
// scheduled notifications, not to send an email, so it intentionally has no template entry.
const EXPECTED_TYPES = [
  "USER_INVITED",
  "INVITE_ACCEPTED",
  "TEAM_MEMBER_ADDED",
  "EVENT_HOST_ADDED",
  "AVAILABILITY_EXCEPTION_CREATED",
  "AVAILABILITY_EXCEPTION_REMOVED",
  "BOOKING_CONFIRMED",
  "BOOKING_CONFIRMED_DEFERRED",
  "BOOKING_RESCHEDULED",
  "BOOKING_CANCELLED",
  "BOOKING_NO_SHOW",
  "COACH_BOOKING_ASSIGNED",
  "COACH_BOOKING_COHOST_ASSIGNED",
  "COACH_BOOKING_CANCELLED",
  "COACH_BOOKING_COHOST_CANCELLED",
  "COACH_BOOKING_NO_SHOW",
  "COACH_BOOKING_COHOST_NO_SHOW",
  "TEAM_BOOKING_CONFIRMED",
  "TEAM_BOOKING_CANCELLED",
  "TEAM_BOOKING_NO_SHOW",
  "SESSION_REMINDER_24H",
  "SESSION_REMINDER_12H",
  "SESSION_REMINDER_6H",
  "SESSION_REMINDER_1H",
  "COACH_REVEAL_SENT",
  "ZOOM_ISV_LINK_EXPIRY_REMINDER",
] as const;

describe("emailTemplates registry", () => {
  it("contains an entry for every NotificationType except CANCEL_BOOKING_REMINDERS", () => {
    for (const type of EXPECTED_TYPES) {
      expect(emailTemplates).toHaveProperty(type);
    }
  });

  it("does NOT contain CANCEL_BOOKING_REMINDERS (control message, no email)", () => {
    expect(emailTemplates).not.toHaveProperty("CANCEL_BOOKING_REMINDERS");
  });

  it("has exactly 26 entries", () => {
    expect(Object.keys(emailTemplates)).toHaveLength(26);
  });

  it("every entry has non-empty subject, text, and html string fields", () => {
    for (const [, template] of Object.entries(emailTemplates)) {
      expect(typeof template.subject).toBe("string");
      expect(template.subject.length).toBeGreaterThan(0);
      expect(typeof template.text).toBe("string");
      expect(typeof template.html).toBe("string");
    }
  });
});

import { emailTemplates } from "./registry";

// Every NotificationType that maps to an email template (all except control messages).
// Control messages (CANCEL_BOOKING_REMINDERS, CANCEL_EVENT_LINK_EXPIRY_REMINDER) instruct
// the service to cancel scheduled notifications — they do not send emails themselves.
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
  "BOOKING_CANCELLED_DEFERRED",
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
  "EVENT_ACTIVATED",
  "EVENT_DEACTIVATED",
  "STUDENT_CUSTOM_EMAIL",
  "STUDENT_SESSION_FEEDBACK",
  "BOOKING_CONFIRMED_ANONYMOUS",
  "BOOKING_CANCELLED_ANONYMOUS",
  "SESSION_REMINDER_ANONYMOUS_24H",
  "SESSION_REMINDER_ANONYMOUS_12H",
  "SESSION_REMINDER_ANONYMOUS_6H",
  "SESSION_REMINDER_ANONYMOUS_1H",
  "ANONYMOUS_BOOKING_POOL_REMINDER",
  "ANONYMOUS_SLOT_CANCELLED_POOL",
  "EVENT_LOCATION_LINK_EXPIRY_REMINDER",
] as const;

describe("emailTemplates registry", () => {
  it("contains an entry for every NotificationType except control messages", () => {
    for (const type of EXPECTED_TYPES) {
      expect(emailTemplates).toHaveProperty(type);
    }
  });

  it("does NOT contain control messages (no email templates for cancellation types)", () => {
    expect(emailTemplates).not.toHaveProperty("CANCEL_BOOKING_REMINDERS");
    expect(emailTemplates).not.toHaveProperty("CANCEL_EVENT_LINK_EXPIRY_REMINDER");
  });

  it("has exactly 40 entries", () => {
    expect(Object.keys(emailTemplates)).toHaveLength(40);
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

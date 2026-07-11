import type { TemplateVariables } from "../types/notification";

/**
 * The single canonical list of every variable name a notification call site is
 * known to supply today. Two consumers share this one list on purpose:
 *  - goldenOutput.test.ts renders every template with these values to snapshot
 *    exactly what students/coaches/admins receive.
 *  - variableContract.test.ts asserts every {{placeholder}} any template
 *    references is a name that appears here — catching a template drifting to a
 *    name (typo or rename) nothing actually supplies, the same failure mode that
 *    shipped a missing-cancelUrl bug and a co-host-details naming mismatch.
 * Adding a new variable to a template means adding it here too, deliberately.
 */
export const SAMPLE_VARIABLES: TemplateVariables = {
  authNote: "This link is safe to use and was sent to you directly.",
  cancelUrl: "https://app.example.com/cancel/booking-123?token=cancel-tok",
  cancellationDetails: "\nReason: Schedule conflict",
  cancellationDetailsHtml: "<br/><strong>Reason:</strong> Schedule conflict",
  changedByName: "Jordan Admin",
  coCoachDetails: "\nCo-coaches: Sam Co-coach",
  coCoachDetailsHtml: "<br/><strong>Co-coaches:</strong> Sam Co-coach",
  coachName: "Jamie Coach",
  confirmedCount: 4,
  date: "July 15, 2026",
  eventId: "event-abc-123",
  eventName: "Career Coaching Session",
  expiresAt: "2026-08-01",
  expiryDate: "August 1, 2026",
  feedbackFormLink: "https://forms.example.com/feedback",
  frontendUrl: "https://app.example.com",
  htmlBody: "<p>Custom message body</p>",
  inviteUrl: "https://app.example.com/invite/abc",
  inviteeEmail: "invitee@example.com",
  inviteeName: "Taylor Invitee",
  meetingJoinUrl: "https://app.example.com/api/public/bookings/booking-123/join?t=tok",
  publicBookingUrl: "https://app.example.com/book/team-slug",
  reminderDays: "3",
  rescheduleUrl: "https://app.example.com/reschedule/booking-123?token=res-tok",
  role: "COACH",
  startTime: "Wednesday, July 15, 2026, 10:00 AM",
  studentEmail: "student@example.com",
  studentName: "Alex Student",
  subject: "Custom Subject Line",
  teamName: "Growth Team",
  textBody: "Custom message body",
  timeRange: "9:00 AM - 5:00 PM",
  timezone: "Eastern Time - US & Canada",
  userName: "Morgan User",
};

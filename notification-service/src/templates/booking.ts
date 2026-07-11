import type { EmailTemplate, NotificationType } from "../types/notification";
import { wrapLayout, BRAND_ORANGE } from "./layout";
import { detailRow, rescheduleCancelFooter } from "./partials";

// BOOKING_CANCELLED_DEFERRED and BOOKING_CANCELLED_ANONYMOUS render identically —
// neither one shows coach identity (deferred: not yet revealed; anonymous: never
// shown), so there's nothing to distinguish in the copy. One shared definition
// instead of two independently-maintained copies that could silently drift.
const genericCancellationEmail: EmailTemplate = {
  subject: "Session Cancelled: {{eventName}}",
  preheader: "Your booking for {{eventName}} has been cancelled.",
  text: "Hi {{studentName}}, your booking for {{eventName}} with {{teamName}} scheduled at {{startTime}} ({{timezone}}) has been cancelled.{{cancellationDetails}} You can book a new session at any time.",
  html: wrapLayout(
    "Session Cancelled",
    `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is to inform you that your upcoming booking has been cancelled.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
         {{cancellationDetailsHtml}}
       </p>
       <p style="margin-top: 16px;">You can book a new session at any time by visiting our booking page.</p>`,
    "Your booking for {{eventName}} has been cancelled.",
    { text: "Book Again", url: "{{publicBookingUrl}}" },
  ),
};

export const bookingTemplates = {
  BOOKING_CONFIRMED: {
    subject: "Confirmed: {{eventName}} with {{coachName}}",
    preheader: "Your session is confirmed for {{startTime}}.",
    text: "Hi {{studentName}}, your booking for {{eventName}} is confirmed for {{startTime}} ({{timezone}}).{{coCoachDetails}} Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Booking Confirmation",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> is confirmed.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
         {{coCoachDetailsHtml}}
       </p>`,
      "Your session is confirmed for {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      rescheduleCancelFooter(),
    ),
  },

  BOOKING_RESCHEDULED: {
    subject: "Rescheduled: {{eventName}} on {{startTime}}",
    preheader: "Your session has been rescheduled to {{startTime}}.",
    text: "Hi {{studentName}}, your session for {{eventName}} has been successfully rescheduled to {{startTime}} ({{timezone}}).",
    html: wrapLayout(
      "Session Rescheduled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> has been successfully rescheduled.</p>
       <p style="margin-top: 16px;">
         ${detailRow("New Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Coach", "{{coachName}}")}
         {{coCoachDetailsHtml}}
       </p>`,
      "Your session has been rescheduled to {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      rescheduleCancelFooter(true),
    ),
  },

  BOOKING_RESCHEDULED_DEFERRED: {
    subject: "Session Update: {{eventName}} has a new time",
    preheader: "Your session has been rescheduled. Coach details will follow shortly before the session.",
    text: "Hi {{studentName}}, your session for {{eventName}} with {{teamName}} has been rescheduled to {{startTime}} ({{timezone}}). You will receive coach and join details shortly before the session starts. Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Rescheduled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with the <strong>{{teamName}}</strong> has been successfully rescheduled.</p>
       <p style="margin-top: 16px;">
         ${detailRow("New Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
       </p>
       <p style="margin-top: 16px;">Your coach and session join details will be sent to you shortly before the session starts.</p>`,
      "Your session has been rescheduled. Coach details coming soon.",
      undefined,
      rescheduleCancelFooter(true),
    ),
  },

  SLOT_RESCHEDULED: {
    subject: "Session Update: {{eventName}} has been rescheduled",
    preheader: "Your session has been moved to {{startTime}}.",
    text: "Hi {{studentName}}, your session for {{eventName}} with {{coachName}} has been rescheduled by the organiser to {{startTime}} ({{timezone}}). Please update your calendar accordingly.",
    html: wrapLayout(
      "Session Rescheduled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your upcoming session has been rescheduled by the organiser.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("New Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Coach", "{{coachName}}")}
       </p>
       <p>Please update your calendar accordingly.</p>`,
      "Your session has been moved to {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  SLOT_RESCHEDULED_DEFERRED: {
    subject: "Session Update: {{eventName}} has been rescheduled",
    preheader: "Your session has been moved to {{startTime}}. Coach details will follow shortly before the session.",
    text: "Hi {{studentName}}, your session for {{eventName}} with {{teamName}} has been rescheduled by the organiser to {{startTime}} ({{timezone}}). You will receive coach and join details shortly before the session starts.",
    html: wrapLayout(
      "Session Rescheduled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your upcoming session has been rescheduled by the organiser.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("New Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
       </p>
       <p style="margin-top: 16px;">Your coach and session join details will be sent to you shortly before the session starts.</p>`,
      "Your session has been moved to {{startTime}}. Coach details coming soon.",
      undefined,
    ),
  },

  SLOT_RESCHEDULED_ANONYMOUS: {
    subject: "Session Update: {{eventName}} has been rescheduled",
    preheader: "Your session has been moved to {{startTime}}.",
    text: "Hi {{studentName}}, your session for {{eventName}} with {{teamName}} has been rescheduled by the organiser to {{startTime}} ({{timezone}}). Please update your calendar accordingly.",
    html: wrapLayout(
      "Session Rescheduled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your upcoming session has been rescheduled by the organiser.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("New Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
       </p>
       <p>Please update your calendar accordingly.</p>`,
      "Your session has been moved to {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  SLOT_COACH_REASSIGNED: {
    subject: "Session Update: Your coach for {{eventName}} has changed",
    preheader: "Your session on {{startTime}} now has a new coach.",
    text: "Hi {{studentName}}, your upcoming session for {{eventName}} on {{startTime}} ({{timezone}}) will now be hosted by {{coachName}}. Your meeting link has been updated accordingly. Please disregard the coach details in your earlier confirmation email.",
    html: wrapLayout(
      "Coach Update",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your upcoming session has been assigned to a new coach by the organiser.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("New Coach", "{{coachName}}")}
       </p>
       <p>Please disregard the coach details in your earlier confirmation email.</p>`,
      "Your session on {{startTime}} now has a new coach.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  SLOT_COACH_REASSIGNED_COACH: {
    subject: "You've been assigned to host: {{eventName}}",
    preheader: "You are now hosting a session on {{startTime}}.",
    text: "Hi {{coachName}}, you have been assigned to host a session for {{eventName}} on {{startTime}} ({{timezone}}) for the {{teamName}} team.",
    html: wrapLayout(
      "Session Assignment",
      `<p>Hi <strong>{{coachName}}</strong>,</p>
       <p>You have been assigned to host a session by the organiser.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
       </p>`,
      "You are now hosting a session on {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  SLOT_RESCHEDULED_COACH: {
    subject: "Session Update: {{eventName}} has been rescheduled",
    preheader: "A session you are hosting has been moved to {{startTime}}.",
    text: "Hi {{coachName}}, the session for {{eventName}} with {{studentName}} has been rescheduled to {{startTime}} ({{timezone}}) by the organiser.",
    html: wrapLayout(
      "Session Rescheduled",
      `<p>Hi <strong>{{coachName}}</strong>,</p>
       <p>A session you are hosting has been rescheduled by the organiser.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("New Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
       </p>`,
      "A session you are hosting has been moved to {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  BOOKING_CANCELLED: {
    subject: "Session Cancelled: {{eventName}}",
    preheader: "Your booking for {{eventName}} has been cancelled.",
    text: "The booking for {{eventName}} scheduled at {{startTime}} ({{timezone}}) with {{coachName}} has been cancelled.{{cancellationDetails}}",
    html: wrapLayout(
      "Session Cancelled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is to inform you that your upcoming booking has been cancelled.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Coach", "{{coachName}}")}
         {{cancellationDetailsHtml}}
       </p>
       <p style="margin-top: 16px;">You can reschedule your session by visiting our booking page.</p>`,
      "Your booking for {{eventName}} has been cancelled.",
      { text: "Book Again", url: "{{publicBookingUrl}}" },
    ),
  },

  BOOKING_CANCELLED_DEFERRED: genericCancellationEmail,

  BOOKING_NO_SHOW: {
    subject: "Booking Marked: No-Show ({{eventName}})",
    preheader: "Your session has been marked as a no-show.",
    text: "The booking for {{eventName}} at {{startTime}} ({{timezone}}) has been marked as a no-show.",
    html: wrapLayout(
      "Session Update: No-Show",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>The following session has been marked as a <strong>no-show</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Coach", "{{coachName}}")}
       </p>`,
      "Your session has been marked as a no-show.",
      { text: "Book New Session", url: "{{publicBookingUrl}}" },
    ),
  },

  BOOKING_CONFIRMED_DEFERRED: {
    subject: "Confirmed: {{eventName}} on {{startTime}}",
    preheader: "Your session is confirmed. Coach details will follow shortly before the session.",
    text: "Hi {{studentName}}, your booking for {{eventName}} on {{startTime}} ({{timezone}}) with {{teamName}} is confirmed. You will receive coach and join details shortly before the session starts. Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Booking Confirmation",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with the <strong>{{teamName}}</strong> is confirmed.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
       </p>
       <p style="margin-top: 16px;">Your coach and session join details will be sent to you shortly before the session starts.</p>`,
      "Your session is confirmed. Coach details coming soon.",
      undefined,
      rescheduleCancelFooter(),
    ),
  },

  STUDENT_SESSION_FEEDBACK: {
    subject: "How was your {{eventName}} session?",
    preheader: "We'd love to hear your feedback on your recent session.",
    text: "Hi {{studentName}}, thank you for attending your {{eventName}} session with {{coachName}} on {{startTime}} ({{timezone}}). Please take a moment to share your feedback: {{feedbackFormLink}}",
    html: wrapLayout(
      "Share Your Feedback",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Thank you for attending your recent session. We'd love to hear how it went!</p>
       <p style="margin-top: 16px;">
         ${detailRow("Session", "{{eventName}}")}
         ${detailRow("Coach", "{{coachName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
       </p>
       <p style="margin-top: 8px;">Your feedback helps us improve the experience for everyone.</p>`,
      "Share your feedback on your recent {{eventName}} session.",
      { text: "Give Feedback", url: "{{feedbackFormLink}}" },
    ),
  },

  COACH_REVEAL_SENT: {
    subject: "Session Details Ready: {{eventName}} on {{startTime}}",
    preheader: "Your coach and session join details are now available.",
    text: "Hi {{studentName}}, your upcoming session {{eventName}} on {{startTime}} ({{timezone}}) will be hosted by {{coachName}}. Join here: {{meetingJoinUrl}}",
    html: wrapLayout(
      "Session Details Ready",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your upcoming session details are now ready. Here is everything you need:</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Coach", "{{coachName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
       </p>`,
      "Your coach details are ready for {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  BOOKING_CONFIRMED_ANONYMOUS: {
    subject: "Confirmed: {{eventName}} on {{startTime}}",
    preheader: "Your session is confirmed for {{startTime}}.",
    text: "Hi {{studentName}}, your booking for {{eventName}} on {{startTime}} ({{timezone}}) with {{teamName}} is confirmed. Join using the link below. Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Booking Confirmation",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with the <strong>{{teamName}}</strong> is confirmed.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
       </p>`,
      "Your session is confirmed for {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      rescheduleCancelFooter(),
    ),
  },

  BOOKING_CANCELLED_ANONYMOUS: genericCancellationEmail,

  ANONYMOUS_SLOT_CANCELLED_POOL: {
    subject: "Slot Cancelled: {{eventName}} on {{startTime}}",
    preheader: "The {{startTime}} slot for {{eventName}} has been cancelled by an administrator.",
    text: "The slot for {{eventName}} scheduled at {{startTime}} ({{timezone}}) has been cancelled by an administrator.",
    html: wrapLayout(
      "Slot Cancelled",
      `<p>The slot for <strong>{{eventName}}</strong> scheduled for <strong>{{startTime}}</strong> ({{timezone}}) has been cancelled by an administrator.</p>
       <p>No further action is required from you.</p>`,
      "The {{startTime}} slot for {{eventName}} has been cancelled.",
    ),
  },
} satisfies Partial<Record<NotificationType, EmailTemplate>>;

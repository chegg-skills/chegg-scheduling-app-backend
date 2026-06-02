import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout, BRAND_ORANGE } from "./layout";
import { detailRow, inlineLink } from "./partials";

export const bookingTemplates: EmailTemplateMap = {
  BOOKING_CONFIRMED: {
    subject: "Confirmed: {{eventName}} with {{coachName}}",
    preheader: "Your session is confirmed for {{startTime}}.",
    text: "Hi {{studentName}}, your booking for {{eventName}} is confirmed for {{startTime}} ({{timezone}}).{{coHostDetails}} Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Booking Confirmation",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> is confirmed.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
         {{coHostDetailsHtml}}
       </p>`,
      "Your session is confirmed for {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
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
         {{coHostDetailsHtml}}
       </p>`,
      "Your session has been rescheduled to {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change it again? ${inlineLink("Reschedule again", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
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

  BOOKING_CANCELLED_DEFERRED: {
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
  },

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
      { text: "View Booking", url: "{{frontendUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
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
};

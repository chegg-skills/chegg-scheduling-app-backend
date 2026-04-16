import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout, BRAND_ORANGE } from "./layout";
import { detailRow, inlineLink } from "./partials";

export const bookingTemplates: EmailTemplateMap = {
  BOOKING_CONFIRMED: {
    subject: "Confirmed: {{eventName}} with {{coachName}}",
    preheader: "Your session is confirmed for {{startTime}}.",
    text: "Hi {{studentName}}, your booking for {{eventName}} is confirmed for {{startTime}} ({{timezone}}).{{coHostDetails}} Reschedule here: {{rescheduleUrl}}",
    html: wrapLayout(
      "Booking Confirmation",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> is confirmed.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Team", "{{teamName}}")}
         {{coHostDetailsHtml}}
       </p>
       <p style="margin-top: 16px; font-size: 13px;">
         Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")}
       </p>`,
      "Your session is confirmed for {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
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
       </p>
       <p style="margin-top: 16px; font-size: 13px;">
         Need to change it again? ${inlineLink("Reschedule again", "{{rescheduleUrl}}")}
       </p>`,
      "Your session has been rescheduled to {{startTime}}.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  BOOKING_CANCELLED: {
    subject: "Session Cancelled: {{eventName}}",
    preheader: "Your booking for {{eventName}} has been cancelled.",
    text: "The booking for {{eventName}} scheduled at {{startTime}} with {{coachName}} has been cancelled.",
    html: wrapLayout(
      "Session Cancelled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is to inform you that your upcoming booking has been cancelled.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Coach", "{{coachName}}")}
       </p>
       <p style="margin-top: 16px;">You can reschedule your session by visiting our booking page.</p>`,
      "Your booking for {{eventName}} has been cancelled.",
      { text: "Reschedule Now", url: "{{publicBookingUrl}}" },
    ),
  },

  BOOKING_NO_SHOW: {
    subject: "Booking Marked: No-Show ({{eventName}})",
    preheader: "Your session has been marked as a no-show.",
    text: "The booking for {{eventName}} at {{startTime}} has been marked as a no-show.",
    html: wrapLayout(
      "Session Update: No-Show",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>The following session has been marked as a <strong>no-show</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Coach", "{{coachName}}")}
       </p>`,
      "Your session has been marked as a no-show.",
      { text: "Book New Session", url: "{{publicBookingUrl}}" },
    ),
  },
};

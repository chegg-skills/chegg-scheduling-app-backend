import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout } from "./layout";
import { inlineLink, detailRow } from "./partials";

export const reminderTemplates: EmailTemplateMap = {
  SESSION_REMINDER_24H: {
    subject: "Tomorrow: Your session for {{eventName}} starts soon!",
    preheader: "Your session is tomorrow at {{startTime}} — don't forget!",
    text: "Hi {{studentName}}, your session for {{eventName}} is scheduled for tomorrow at {{startTime}}. Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Upcoming Session Reminder",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is a reminder that your session for <strong>{{eventName}}</strong> is scheduled for tomorrow.</p>
       <p style="margin-top: 16px;">
         <strong>Coach:</strong> {{coachName}}<br/>
         <strong>Time:</strong> {{startTime}} ({{timezone}})
       </p>`,
      "Your session is tomorrow at {{startTime}} — don't forget!",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  SESSION_REMINDER_12H: {
    subject: "Reminder: {{eventName}} is in 12 hours",
    preheader: "Your session starts in 12 hours — see you soon!",
    text: "Hi {{studentName}}, your session for {{eventName}} is scheduled for today in 12 hours ({{startTime}}). Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Reminder (12h)",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Just a quick reminder that your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> is scheduled for today.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>`,
      "Your session starts in 12 hours — see you soon!",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  SESSION_REMINDER_6H: {
    subject: "Reminder: {{eventName}} is in 6 hours",
    preheader: "Your session starts in 6 hours — be ready!",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in 6 hours ({{startTime}}). Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Reminder (6h)",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is a reminder that your session for <strong>{{eventName}}</strong> starts in 6 hours.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>`,
      "Your session starts in 6 hours — be ready!",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  SESSION_REMINDER_1H: {
    subject: "Starting Soon: {{eventName}} begins in 1 hour",
    preheader: "Your session starts in 1 hour — get ready!",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in about 1 hour. Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Starting Soon",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> starts in 1 hour.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>`,
      "Your session starts in 1 hour — get ready!",
      { text: "Join Now", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  SESSION_REMINDER_ANONYMOUS_24H: {
    subject: "Reminder: {{eventName}} is tomorrow",
    preheader: "Your session is tomorrow — join using the link below.",
    text: "Hi {{studentName}}, your session for {{eventName}} is tomorrow at {{startTime}} ({{timezone}}). Join using the link below. Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Reminder (24h)",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is a reminder that your session for <strong>{{eventName}}</strong> is tomorrow.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>`,
      "Your session is tomorrow — join using the link below.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  SESSION_REMINDER_ANONYMOUS_12H: {
    subject: "Reminder: {{eventName}} is in 12 hours",
    preheader: "Your session starts in 12 hours.",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in 12 hours ({{startTime}}). Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Reminder (12h)",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is a reminder that your session for <strong>{{eventName}}</strong> starts in 12 hours.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>`,
      "Your session starts in 12 hours.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  SESSION_REMINDER_ANONYMOUS_6H: {
    subject: "Reminder: {{eventName}} is in 6 hours",
    preheader: "Your session starts in 6 hours.",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in 6 hours ({{startTime}}). Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Reminder (6h)",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is a reminder that your session for <strong>{{eventName}}</strong> starts in 6 hours.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>`,
      "Your session starts in 6 hours.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  SESSION_REMINDER_ANONYMOUS_1H: {
    subject: "Starting Soon: {{eventName}} begins in 1 hour",
    preheader: "Your session starts in 1 hour.",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in about 1 hour at {{startTime}} ({{timezone}}). Reschedule: {{rescheduleUrl}} | Cancel: {{cancelUrl}}",
    html: wrapLayout(
      "Session Starting Soon",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> starts in 1 hour.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>`,
      "Your session starts in 1 hour.",
      { text: "Join Now", url: "{{meetingJoinUrl}}" },
      `Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")} or ${inlineLink("Cancel session", "{{cancelUrl}}")}`,
    ),
  },

  ANONYMOUS_BOOKING_POOL_REMINDER: {
    subject: "Upcoming Anonymous Session: {{eventName}} on {{startTime}}",
    preheader: "You have an anonymous session with {{confirmedCount}} confirmed participants.",
    text: "You have an anonymous session for {{eventName}} on {{startTime}} ({{timezone}}) with {{confirmedCount}} confirmed participant(s). Please coordinate with your team and join using the event link.",
    html: wrapLayout(
      "Upcoming Anonymous Session",
      `<p>You have an upcoming anonymous session scheduled for <strong>{{eventName}}</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Timezone", "{{timezone}}")}
         ${detailRow("Confirmed Participants", "{{confirmedCount}}")}
       </p>
       <p style="margin-top: 16px;">Please coordinate with your team ahead of the session.</p>`,
      "You have an anonymous session with {{confirmedCount}} confirmed participants.",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },
};

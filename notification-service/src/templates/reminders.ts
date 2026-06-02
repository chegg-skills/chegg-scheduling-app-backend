import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout } from "./layout";
import { inlineLink } from "./partials";

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
};

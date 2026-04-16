import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout } from "./layout";
import { inlineLink } from "./partials";

export const reminderTemplates: EmailTemplateMap = {
  SESSION_REMINDER_24H: {
    subject: "Tomorrow: Your session for {{eventName}} starts soon!",
    preheader: "Your session is tomorrow at {{startTime}} — don't forget!",
    text: "Hi {{studentName}}, your session for {{eventName}} is scheduled for tomorrow at {{startTime}}. Reschedule: {{rescheduleUrl}}",
    html: wrapLayout(
      "Upcoming Session Reminder",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is a reminder that your session for <strong>{{eventName}}</strong> is scheduled for tomorrow.</p>
       <p style="margin-top: 16px;">
         <strong>Coach:</strong> {{coachName}}<br/>
         <strong>Time:</strong> {{startTime}} ({{timezone}})
       </p>
       <p style="margin-top: 16px; font-size: 13px;">
         Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")}
       </p>`,
      "Your session is tomorrow at {{startTime}} — don't forget!",
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" },
    ),
  },

  SESSION_REMINDER_1H: {
    subject: "Starting Soon: {{eventName}} begins in 1 hour",
    preheader: "Your session starts in 1 hour — get ready!",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in about 1 hour. Reschedule: {{rescheduleUrl}}",
    html: wrapLayout(
      "Session Starting Soon",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> starts in 1 hour.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>
       <p style="margin-top: 16px; font-size: 13px;">
         Need to change the time? ${inlineLink("Reschedule session", "{{rescheduleUrl}}")}
       </p>`,
      "Your session starts in 1 hour — get ready!",
      { text: "Join Now", url: "{{meetingJoinUrl}}" },
    ),
  },
};

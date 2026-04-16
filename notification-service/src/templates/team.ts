import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout } from "./layout";
import { detailRow } from "./partials";

export const teamTemplates: EmailTemplateMap = {
  TEAM_MEMBER_ADDED: {
    subject: "Added to Team: {{teamName}}",
    preheader: "You have been added to the {{teamName}} team.",
    text: "Hi {{userName}}, you have been added to the team {{teamName}} on Chegg Scheduling App.",
    html: wrapLayout(
      "Team Assignment",
      `<p>Hi <strong>{{userName}}</strong>,</p>
       <p>You have been officially added to the <strong>{{teamName}}</strong> team on the Chegg Scheduling App.</p>
       <p>You can now manage events and view availability for this team.</p>`,
      "You have been added to the {{teamName}} team.",
      { text: "Go to Dashboard", url: "{{frontendUrl}}" },
    ),
  },

  EVENT_HOST_ADDED: {
    subject: "Assigned to Event: {{eventName}}",
    preheader: "You have been assigned as a host for {{eventName}}.",
    text: "Hi {{userName}}, you have been assigned as a host for the event {{eventName}}.",
    html: wrapLayout(
      "Event Host Assignment",
      `<p>Hi <strong>{{userName}}</strong>,</p>
       <p>You have been assigned as a host for: <strong>{{eventName}}</strong>.</p>
       <p>Please ensure your availability is up to date in the dashboard.</p>`,
      "You have been assigned as a host for {{eventName}}.",
      { text: "View Event Details", url: "{{frontendUrl}}" },
    ),
  },

  AVAILABILITY_EXCEPTION_CREATED: {
    subject: "Availability Update: {{userName}} ({{date}})",
    preheader: "An availability update has been made for {{userName}}.",
    text: "An availability exception has been set for {{userName}} on {{date}} ({{timeRange}}).",
    html: wrapLayout(
      "Availability Update",
      `<p>An update has been made to the availability for <strong>{{userName}}</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Date", "{{date}}")}
         ${detailRow("Time Range", "{{timeRange}}")}
       </p>`,
      "An availability update has been made for {{userName}}.",
      { text: "Manage Availability", url: "{{frontendUrl}}" },
    ),
  },

  TEAM_BOOKING_CONFIRMED: {
    subject: "Team Update: New Booking ({{eventName}})",
    preheader: "A new session has been added to your team's schedule.",
    text: "A new booking has been created for {{teamName}}. Student: {{studentName}}. Time: {{startTime}}.{{coHostDetails}}",
    html: wrapLayout(
      "New Team Booking",
      `<p>A new session has been added to your team's schedule.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Student", "{{studentName}}")}
         ${detailRow("Coach", "{{coachName}}")}
         ${detailRow("Time", "{{startTime}} ({{timezone}})")}
         {{coHostDetailsHtml}}
       </p>`,
      "A new session has been added to your team's schedule.",
      { text: "View Team Schedule", url: "{{frontendUrl}}" },
    ),
  },
};

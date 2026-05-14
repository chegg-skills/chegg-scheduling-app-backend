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

  AVAILABILITY_EXCEPTION_REMOVED: {
    subject: "Availability Update: {{userName}} ({{date}})",
    preheader: "An availability exception has been removed for {{userName}}.",
    text: "An availability exception has been removed for {{userName}} on {{date}} ({{timeRange}}).",
    html: wrapLayout(
      "Availability Update",
      `<p>An availability exception has been <strong>removed</strong> for <strong>{{userName}}</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Date", "{{date}}")}
         ${detailRow("Time Range", "{{timeRange}}")}
       </p>`,
      "An availability exception has been removed for {{userName}}.",
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

  TEAM_BOOKING_CANCELLED: {
    subject: "Team Update: Booking Cancelled ({{eventName}})",
    preheader: "A session in your team has been cancelled.",
    text: "A booking for {{teamName}} ({{eventName}}) has been cancelled. Student: {{studentName}}. Time: {{startTime}}.",
    html: wrapLayout(
      "Team Booking Cancelled",
      `<p>A session in your team schedule has been <strong>cancelled</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Student", "{{studentName}}")}
         ${detailRow("Time", "{{startTime}}")}
       </p>`,
      "A session in your team has been cancelled.",
      { text: "View Team Dashboard", url: "{{frontendUrl}}" },
    ),
  },

  TEAM_BOOKING_NO_SHOW: {
    subject: "Team Update: Student No-Show ({{eventName}})",
    preheader: "A student did not show up for a session in your team.",
    text: "The student {{studentName}} did not show up for {{eventName}} at {{startTime}}.",
    html: wrapLayout(
      "Team Booking: No-Show",
      `<p>A session in your team has been marked as a <strong>no-show</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Student", "{{studentName}}")}
         ${detailRow("Coach", "{{coachName}}")}
         ${detailRow("Time", "{{startTime}}")}
       </p>`,
      "A student did not show up for a session in your team.",
      { text: "View Team Dashboard", url: "{{frontendUrl}}" },
    ),
  },

  ZOOM_ISV_LINK_EXPIRY_REMINDER: {
    subject: "Action Required: Your Zoom ISV link expires on {{expiryDate}}",
    preheader:
      "Your Zoom ISV link expires in {{reminderDays}} days — update it before it breaks student sessions.",
    text: "Hi {{coachName}}, your Zoom ISV link is set to expire on {{expiryDate}}. Please update it in your profile before it expires to avoid disrupting student sessions.",
    html: wrapLayout(
      "Zoom ISV Link Expiring Soon",
      `<p>Hi <strong>{{coachName}}</strong>,</p>
       <p>Your Zoom ISV link is set to expire on <strong>{{expiryDate}}</strong>.</p>
       <p style="margin-top: 16px;">Please update your link before it expires — once expired, students won't be able to join sessions until a new link is saved.</p>`,
      "Your Zoom ISV link expires on {{expiryDate}}.",
      { text: "Update Profile", url: "{{frontendUrl}}/profile" },
    ),
  },
};

import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout } from "./layout";
import { detailRow } from "./partials";

export const coachTemplates: EmailTemplateMap = {
  COACH_BOOKING_ASSIGNED: {
    subject: "New Booking: {{eventName}} (Student: {{studentName}})",
    preheader: "A new session has been scheduled for you.",
    text: "A new booking has been assigned to you for {{eventName}}. Student: {{studentName}} ({{startTime}}).{{coHostDetails}}",
    html: wrapLayout(
      "New Session Assigned",
      `<p>Hi <strong>{{coachName}}</strong>,</p>
       <p>A new session has been scheduled for you.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Student", "{{studentName}} ({{studentEmail}})")}
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}} ({{timezone}})")}
         {{coHostDetailsHtml}}
       </p>`,
      "A new session has been scheduled for you.",
      { text: "View Details", url: "{{meetingJoinUrl}}" },
    ),
  },

  COACH_BOOKING_COHOST_ASSIGNED: {
    subject: "Co-host Assigned: {{eventName}} (Student: {{studentName}})",
    preheader: "You have been added as a co-host for an upcoming session.",
    text: "You have been assigned as a co-host for {{eventName}} with {{studentName}} at {{startTime}}.",
    html: wrapLayout(
      "Co-host Assignment",
      `<p>Hi there,</p>
       <p>You have been added as a <strong>co-host</strong> for an upcoming session.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Lead Coach", "{{coachName}}")}
         ${detailRow("Student", "{{studentName}}")}
         ${detailRow("Time", "{{startTime}} ({{timezone}})")}
       </p>`,
      "You have been added as a co-host for an upcoming session.",
      { text: "Join Session", url: "{{meetingJoinUrl}}" },
    ),
  },

  COACH_BOOKING_CANCELLED: {
    subject: "Session Cancelled: {{eventName}} (Student: {{studentName}})",
    preheader: "A session with {{studentName}} has been cancelled.",
    text: "Your session for {{eventName}} with {{studentName}} at {{startTime}} has been cancelled.",
    html: wrapLayout(
      "Student Session Cancelled",
      `<p>Hi <strong>{{coachName}}</strong>,</p>
       <p>The following session has been cancelled by the student or an administrator:</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Student", "{{studentName}}")}
       </p>`,
      "A session with {{studentName}} has been cancelled.",
    ),
  },

  COACH_BOOKING_COHOST_CANCELLED: {
    subject: "Co-host Session Cancelled: {{eventName}}",
    preheader: "A co-hosted session has been cancelled.",
    text: "Your co-hosting session for {{eventName}} with {{studentName}} has been cancelled.",
    html: wrapLayout(
      "Co-host Session Cancelled",
      `<p>Hi there,</p>
       <p>The following session where you were assigned as a <strong>co-host</strong> has been cancelled:</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Student", "{{studentName}}")}
       </p>`,
      "A co-hosted session has been cancelled.",
    ),
  },

  COACH_BOOKING_COHOST_NO_SHOW: {
    subject: "Co-host Update: Student No-Show ({{eventName}})",
    preheader: "A student did not show up for a co-hosted session.",
    text: "The student {{studentName}} did not show up for {{eventName}}.",
    html: wrapLayout(
      "Co-host Update: No-Show",
      `<p>Hi there,</p>
       <p>The following session has been marked as a <strong>no-show</strong>.</p>
       <p style="margin-top: 16px;">
         ${detailRow("Event", "{{eventName}}")}
         ${detailRow("Time", "{{startTime}}")}
         ${detailRow("Student", "{{studentName}}")}
       </p>`,
      "A student did not show up for a co-hosted session.",
    ),
  },
};

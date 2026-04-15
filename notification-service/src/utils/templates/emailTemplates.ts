import type { EmailTemplateMap } from "../../types/notification";

const BRAND_ORANGE = "#E87100";
const BRAND_DARK = "#3A2C41";
const TEXT_MAIN = "#3A2C41";
const TEXT_SECONDARY = "#525252";
const DIVIDER = "#DEE3ED";

const LOGO_URL = "https://img.logokit.com/chegg.com";

const wrapLayout = (title: string, content: string, cta?: { text: string; url: string }) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 600px) {
          .email-container { padding: 20px 10px !important; }
          .email-card { padding: 24px !important; width: 100% !important; border-radius: 4px !important; }
          .email-title { font-size: 16px !important; }
          .email-content { font-size: 13px !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8F9FA;">
      <div class="email-container" style="font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F9FA; padding: 40px 20px; color: ${TEXT_MAIN}; line-height: 1.6;">
        <div class="email-card" style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-sizing: border-box; border: 1px solid ${DIVIDER};">
          <h1 class="email-title" style="font-size: 20px; font-weight: 800; margin: 0 0 24px; color: ${BRAND_DARK}; text-align: left; letter-spacing: -0.01em;">${title}</h1>
          
          <div class="email-content" style="font-size: 15px; color: ${TEXT_MAIN}; text-align: left; font-weight: 500;">
            ${content}
          </div>
          
          ${cta ? `
            <div style="margin: 32px 0; text-align: left;">
              <a href="${cta.url}" style="display: inline-block; background-color: ${BRAND_ORANGE}; color: #ffffff; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px;">
                ${cta.text}
              </a>
            </div>
          ` : ""}
          
          <div style="margin-top: 40px; padding-top: 20px;">
            <img src="${LOGO_URL}" alt="Chegg Logo" width="60" style="display: block; margin: 0 0 12px; text-align: left;" />
            <p style="font-size: 12px; color: ${TEXT_SECONDARY}; margin: 0; text-align: left;">
              Automated priority message from Chegg Scheduling.
            </p>
            <p style="font-size: 11px; color: #9CA3AF; margin: 8px 0 0; text-align: left;">
              &copy; ${new Date().getFullYear()} Chegg Inc.
            </p>
          </div>
        </div>
      </div>
    </body>
  </html>
`;

const emailTemplates: EmailTemplateMap = {
  USER_INVITED: {
    subject: "You've been invited: Chegg Scheduling App",
    text: "You have been invited as a {{role}}. Use this link to accept your invite: {{inviteUrl}}. This invite expires on {{expiresAt}}.",
    html: wrapLayout(
      "Invitation to join the team",
      `<p>Hi there,</p>
       <p>You've been invited to join the <strong>Chegg Scheduling App</strong> as a <strong>{{role}}</strong>.</p>
       <p>This invitation will expire on <strong>{{expiresAt}}</strong>.</p>
       <p>Please accept your invitation to finalize your account setup.</p>`,
      { text: "Accept Invitation", url: "{{inviteUrl}}" }
    ),
    attachmentRequired: false,
  },
  INVITE_ACCEPTED: {
    subject: "Invite Accepted: {{inviteeName}}",
    text: "{{inviteeName}} ({{inviteeEmail}}) has accepted the invite and joined as a {{role}}.",
    html: wrapLayout(
      "Invitation Accepted",
      `<p><strong>{{inviteeName}}</strong> ({{inviteeEmail}}) has successfully joined the application.</p>
       <p style="margin-top: 16px;"><strong>Assigned Role:</strong> {{role}}</p>`
    ),
    attachmentRequired: false,
  },
  TEAM_MEMBER_ADDED: {
    subject: "Added to Team: {{teamName}}",
    text: "Hi {{userName}}, you have been added to the team {{teamName}} on Chegg Scheduling App.",
    html: wrapLayout(
      "Team Assignment",
      `<p>Hi <strong>{{userName}}</strong>,</p>
       <p>You have been officially added to the <strong>{{teamName}}</strong> team on the Chegg Scheduling App.</p>
       <p>You can now manage events and view availability for this team.</p>`,
      { text: "Go to Dashboard", url: "{{frontendUrl}}" }
    ),
    attachmentRequired: false,
  },
  EVENT_HOST_ADDED: {
    subject: "Assigned to Event: {{eventName}}",
    text: "Hi {{userName}}, you have been assigned as a host for the event {{eventName}}.",
    html: wrapLayout(
      "Event Host Assignment",
      `<p>Hi <strong>{{userName}}</strong>,</p>
       <p>You have been assigned as a host for: <strong>{{eventName}}</strong>.</p>
       <p>Please ensure your availability is up to date in the dashboard.</p>`,
      { text: "View Event Details", url: "{{frontendUrl}}" }
    ),
    attachmentRequired: false,
  },
  AVAILABILITY_EXCEPTION_CREATED: {
    subject: "Availability Update: {{userName}} ({{date}})",
    text: "An availability exception has been set for {{userName}} on {{date}} ({{timeRange}}).",
    html: wrapLayout(
      "Availability Update",
      `<p>An update has been made to the availability for <strong>{{userName}}</strong>.</p>
       <p style="margin-top: 16px;">
         <strong>Date:</strong> {{date}}<br/>
         <strong>Time Range:</strong> {{timeRange}}
       </p>`,
      { text: "Manage Availability", url: "{{frontendUrl}}" }
    ),
    attachmentRequired: false,
  },
  BOOKING_CONFIRMED: {
    subject: "Confirmed: {{eventName}} with {{coachName}}",
    text: "Hi {{studentName}}, your booking for {{eventName}} is confirmed for {{startTime}} ({{timezone}}).{{coHostDetails}} Reschedule here: {{rescheduleUrl}}",
    html: wrapLayout(
      "Booking Confirmation",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> is confirmed.</p>
       <p style="margin-top: 16px;">
          <strong>Time:</strong> {{startTime}}<br/>
          <strong>Timezone:</strong> {{timezone}}<br/>
          <strong>Team:</strong> {{teamName}}{{coHostDetailsHtml}}
        </p>
        <p style="margin-top: 16px; font-size: 13px;">
          Need to change the time? <a href="{{rescheduleUrl}}" style="color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 600;">Reschedule session</a>
        </p>`,
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  BOOKING_RESCHEDULED: {
    subject: "Rescheduled: {{eventName}} on {{startTime}}",
    text: "Hi {{studentName}}, your session for {{eventName}} has been successfully rescheduled to {{startTime}} ({{timezone}}).",
    html: wrapLayout(
      "Session Rescheduled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> has been successfully rescheduled.</p>
       <p style="margin-top: 16px;">
          <strong>New Time:</strong> {{startTime}}<br/>
          <strong>Timezone:</strong> {{timezone}}<br/>
          <strong>Coach:</strong> {{coachName}}{{coHostDetailsHtml}}
        </p>
        <p style="margin-top: 16px; font-size: 13px;">
          Need to change it again? <a href="{{rescheduleUrl}}" style="color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 600;">Reschedule again</a>
        </p>`,
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  COACH_BOOKING_ASSIGNED: {
    subject: "New Booking: {{eventName}} (Student: {{studentName}})",
    text: "A new booking has been assigned to you for {{eventName}}. Student: {{studentName}} ({{startTime}}).{{coHostDetails}}",
    html: wrapLayout(
      "New Session Assigned",
      `<p>Hi <strong>{{coachName}}</strong>,</p>
       <p>A new session has been scheduled for you.</p>
       <p style="margin-top: 16px;">
         <strong>Student:</strong> {{studentName}} ({{studentEmail}})<br/>
          <strong>Event:</strong> {{eventName}}<br/>
          <strong>Time:</strong> {{startTime}} ({{timezone}}){{coHostDetailsHtml}}
        </p>`,
      { text: "View Details", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  COACH_BOOKING_COHOST_ASSIGNED: {
    subject: "Co-host Assigned: {{eventName}} (Student: {{studentName}})",
    text: "You have been assigned as a co-host for {{eventName}} with {{studentName}} at {{startTime}}.",
    html: wrapLayout(
      "Co-host Assignment",
      `<p>Hi there,</p>
       <p>You have been added as a <strong>co-host</strong> for an upcoming session.</p>
       <p style="margin-top: 16px;">
         <strong>Event:</strong> {{eventName}}<br/>
         <strong>Lead Coach:</strong> {{coachName}}<br/>
         <strong>Student:</strong> {{studentName}}<br/>
         <strong>Time:</strong> {{startTime}} ({{timezone}})
       </p>`,
      { text: "Join Session", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  BOOKING_CANCELLED: {
    subject: "Session Cancelled: {{eventName}}",
    text: "The booking for {{eventName}} scheduled at {{startTime}} with {{coachName}} has been cancelled.",
    html: wrapLayout(
      "Session Cancelled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is to inform you that your upcoming booking has been cancelled.</p>
       <p style="margin-top: 16px;">
         <strong>Event:</strong> {{eventName}}<br/>
         <strong>Time:</strong> {{startTime}}<br/>
         <strong>Coach:</strong> {{coachName}}
       </p>
       <p style="margin-top: 16px;">You can reschedule your session by visiting our booking page.</p>`,
      { text: "Reschedule Now", url: "{{publicBookingUrl}}" }
    ),
    attachmentRequired: false,
  },
  BOOKING_NO_SHOW: {
    subject: "Booking Marked: No-Show ({{eventName}})",
    text: "The booking for {{eventName}} at {{startTime}} has been marked as a no-show.",
    html: wrapLayout(
      "Session Update: No-Show",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>The following session has been marked as a <strong>no-show</strong>.</p>
       <p style="margin-top: 16px;">
         <strong>Event:</strong> {{eventName}}<br/>
         <strong>Time:</strong> {{startTime}}<br/>
         <strong>Coach:</strong> {{coachName}}
       </p>`,
      { text: "Book New Session", url: "{{publicBookingUrl}}" }
    ),
    attachmentRequired: false,
  },
  COACH_BOOKING_CANCELLED: {
    subject: "Session Cancelled: {{eventName}} (Student: {{studentName}})",
    text: "Your session for {{eventName}} with {{studentName}} at {{startTime}} has been cancelled.",
    html: wrapLayout(
      "Student Session Cancelled",
      `<p>Hi <strong>{{coachName}}</strong>,</p>
       <p>The following session has been cancelled by the student or an administrator:</p>
       <p style="margin-top: 16px;">
         <strong>Event:</strong> {{eventName}}<br/>
         <strong>Time:</strong> {{startTime}}<br/>
         <strong>Student:</strong> {{studentName}}
       </p>`
    ),
    attachmentRequired: false,
  },
  COACH_BOOKING_COHOST_CANCELLED: {
    subject: "Co-host Session Cancelled: {{eventName}}",
    text: "Your co-hosting session for {{eventName}} with {{studentName}} has been cancelled.",
    html: wrapLayout(
      "Co-host Session Cancelled",
      `<p>Hi there,</p>
       <p>The following session where you were assigned as a <strong>co-host</strong> has been cancelled:</p>
       <p style="margin-top: 16px;">
         <strong>Event:</strong> {{eventName}}<br/>
         <strong>Time:</strong> {{startTime}}<br/>
         <strong>Student:</strong> {{studentName}}
       </p>`
    ),
    attachmentRequired: false,
  },
  COACH_BOOKING_COHOST_NO_SHOW: {
    subject: "Co-host Update: Student No-Show ({{eventName}})",
    text: "The student {{studentName}} did not show up for {{eventName}}.",
    html: wrapLayout(
      "Co-host Update: No-Show",
      `<p>Hi there,</p>
       <p>The following session has been marked as a <strong>no-show</strong>.</p>
       <p style="margin-top: 16px;">
         <strong>Event:</strong> {{eventName}}<br/>
         <strong>Time:</strong> {{startTime}}<br/>
         <strong>Student:</strong> {{studentName}}
       </p>`
    ),
    attachmentRequired: false,
  },
  TEAM_BOOKING_CONFIRMED: {
    subject: "Team Update: New Booking ({{eventName}})",
    text: "A new booking has been created for {{teamName}}. Student: {{studentName}}. Time: {{startTime}}.{{coHostDetails}}",
    html: wrapLayout(
      "New Team Booking",
      `<p>A new session has been added to your team's schedule.</p>
       <p style="margin-top: 16px;">
         <strong>Event:</strong> {{eventName}}<br/>
          <strong>Student:</strong> {{studentName}}<br/>
          <strong>Coach:</strong> {{coachName}}<br/>
          <strong>Time:</strong> {{startTime}} ({{timezone}}){{coHostDetailsHtml}}
        </p>`,
      { text: "View Team Schedule", url: "{{frontendUrl}}" }
    ),
    attachmentRequired: false,
  },
  SESSION_REMINDER_24H: {
    subject: "Tomorrow: Your session for {{eventName}} starts soon!",
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
          Need to change the time? <a href="{{rescheduleUrl}}" style="color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 600;">Reschedule session</a>
       </p>`,
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  SESSION_REMINDER_1H: {
    subject: "Starting Soon: {{eventName}} begins in 1 hour",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in about 1 hour. Reschedule: {{rescheduleUrl}}",
    html: wrapLayout(
      "Session Starting Soon",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> starts in 1 hour.</p>
       <p style="margin: 24px 0; font-size: 18px; font-weight: 700;">
         {{startTime}} ({{timezone}})
       </p>
       <p style="margin-top: 16px; font-size: 13px;">
          Need to change the time? <a href="{{rescheduleUrl}}" style="color: ${BRAND_ORANGE}; text-decoration: none; font-weight: 600;">Reschedule session</a>
       </p>`,
      { text: "Join Now", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
};

export default emailTemplates;

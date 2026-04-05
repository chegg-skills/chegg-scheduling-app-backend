import type { EmailTemplateMap } from "../../types/notification";

const BRAND_ORANGE = "#FF7500";
const BRAND_DARK = "#00253C";
const BG_COLOR = "#F5F7F8";

const wrapLayout = (title: string, content: string, cta?: { text: string; url: string }) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${BG_COLOR}; padding: 40px 20px; color: #1B2D38; line-height: 1.6;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-top: 6px solid ${BRAND_ORANGE};">
      <div style="padding: 40px 40px 20px;">
        <h1 style="color: ${BRAND_DARK}; font-size: 24px; font-weight: 700; margin-bottom: 24px; letter-spacing: -0.5px;">${title}</h1>
        <div style="font-size: 16px; color: #3E5363;">
          ${content}
        </div>
        ${cta ? `
          <div style="margin-top: 40px; text-align: center;">
            <a href="${cta.url}" style="display: inline-block; padding: 14px 32px; background-color: ${BRAND_ORANGE}; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background 0.2s ease;">
              ${cta.text}
            </a>
          </div>
        ` : ""}
      </div>
      <div style="padding: 20px 40px 40px; background-color: #FAFBFC; border-top: 1px solid #EDEDED;">
        <p style="font-size: 13px; color: #8C99A3; margin: 0;">
          This is an automated message from <strong>Chegg Scheduling App</strong>. 
          If you have questions, please reach out to our <a href="mailto:support@chegg-scheduling.com" style="color: ${BRAND_ORANGE}; text-decoration: none;">support team</a>.
        </p>
      </div>
    </div>
    <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #A4B1BC;">
      &copy; ${new Date().getFullYear()} Chegg Inc. All rights reserved.
    </div>
  </div>
`;

const emailTemplates: EmailTemplateMap = {
  USER_INVITED: {
    subject: "✨ You've been invited: Chegg Scheduling App",
    text: "You have been invited as a {{role}}. Use this link to accept your invite: {{inviteUrl}}. This invite expires on {{expiresAt}}.",
    html: wrapLayout(
      "You're invited to join the team",
      `<p>Hi there,</p>
       <p>You've been invited to join the <strong>Chegg Scheduling App</strong> as a <strong>{{role}}</strong>.</p>
       <p>This invitation will expire on <strong>{{expiresAt}}</strong>.</p>
       <p>Click the button below to accept your invitation and get started.</p>`,
      { text: "Accept Invitation", url: "{{inviteUrl}}" }
    ),
    attachmentRequired: false,
  },
  INVITE_ACCEPTED: {
    subject: "✅ Invite Accepted: {{inviteeName}}",
    text: "{{inviteeName}} ({{inviteeEmail}}) has accepted the invite and joined as a {{role}}.",
    html: wrapLayout(
      "Invitation Accepted",
      `<p>Great news! <strong>{{inviteeName}}</strong> ({{inviteeEmail}}) has successfully accepted the invitation and joined the app.</p>
       <p style="margin-top: 16px;"><strong>Role assigned:</strong> {{role}}</p>`
    ),
    attachmentRequired: false,
  },
  BOOKING_CONFIRMED: {
    subject: "📅 Confirmed: {{eventName}} with {{coachName}}",
    text: "Hi {{studentName}}, your booking for {{eventName}} is confirmed for {{startTime}} ({{timezone}}). Meeting link: {{meetingJoinUrl}}",
    html: wrapLayout(
      "Your booking is confirmed",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Get ready! Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> is officially on the calendar.</p>
       <div style="background: ${BG_COLOR}; padding: 20px; border-radius: 8px; margin: 24px 0;">
         <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #8C99A3; font-weight: 700;">Meeting Details</p>
         <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700;">{{startTime}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #3E5363;">{{timezone}}</p>
         <p style="margin: 12px 0 0; font-size: 14px; color: #3E5363;"><strong>Team:</strong> {{teamName}}</p>
       </div>
       <div style="background: #FFF9E6; border-left: 4px solid #FFC107; padding: 16px; margin: 24px 0; border-radius: 4px;">
         <p style="margin: 0; font-size: 14px; color: #856404;"><strong>🕒 Policy Note:</strong> Please join the session within the first <strong>10 minutes</strong>. Students who arrive later than 10 minutes may be marked as a no-show.</p>
       </div>
       <p>You can join the session directly via the link below:</p>`,
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  COACH_BOOKING_ASSIGNED: {
    subject: "📬 New Booking: {{eventName}} (Student: {{studentName}})",
    text: "A new booking has been assigned to you for {{eventName}}. Student: {{studentName}} ({{studentEmail}}). Time: {{startTime}} ({{timezone}}).",
    html: wrapLayout(
      "A new session has been scheduled",
      `<p>You have a new booking waiting for you.</p>
       <div style="background: ${BG_COLOR}; padding: 20px; border-radius: 8px; margin: 24px 0;">
         <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #8C99A3; font-weight: 700;">Student Info</p>
         <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700;">{{studentName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #3E5363;">{{studentEmail}}</p>
         <p style="margin: 16px 0 0; font-size: 14px; text-transform: uppercase; color: #8C99A3; font-weight: 700;">Session Info</p>
         <p style="margin: 8px 0 0; font-size: 16px; font-weight: 700;">{{eventName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #3E5363;">{{startTime}} ({{timezone}})</p>
       </div>
       <div style="margin: 24px 0; border: 1px solid #EDEDED; border-radius: 8px; padding: 20px;">
         <p style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; color: #8C99A3; font-weight: 700;">Student Inquiry Details</p>
         <p style="margin: 0 0 8px; font-size: 14px;"><strong>Question:</strong> {{specificQuestion}}</p>
         <p style="margin: 0 0 8px; font-size: 14px;"><strong>Tried Solutions:</strong> {{triedSolutions}}</p>
         <p style="margin: 0; font-size: 14px;"><strong>Used Resources:</strong> {{usedResources}}</p>
       </div>`,
      { text: "View Details", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  BOOKING_CANCELLED: {
    subject: "❌ Session Cancelled: {{eventName}}",
    text: "The booking for {{eventName}} scheduled at {{startTime}} ({{timezone}}) with {{coachName}} has been cancelled.",
    html: wrapLayout(
      "Your session was cancelled",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is to inform you that your upcoming booking has been cancelled.</p>
       <div style="background: #FFF0F0; padding: 20px; border-radius: 8px; border: 1px solid #FFDada; margin: 24px 0;">
         <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #C0392B; font-weight: 700;">Cancelled Session</p>
         <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #C0392B;">{{eventName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #D98880;">{{startTime}} ({{timezone}})</p>
         <p style="margin: 12px 0 0; font-size: 14px; color: #3E5363;"><strong>Coach:</strong> {{coachName}}</p>
       </div>
       <p>We apologize for the inconvenience. You can reschedule your session by visiting our booking dashboard.</p>`,
      { text: "Reschedule Now", url: "{{frontendUrl}}" }
    ),
    attachmentRequired: false,
  },
  BOOKING_NO_SHOW: {
    subject: "⚠️ Booking Marked: No-Show ({{eventName}})",
    text: "The booking for {{eventName}} at {{startTime}} ({{timezone}}) has been marked as a no-show.",
    html: wrapLayout(
      "Session Update: No-Show",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>The following session has been marked as a **no-show** because we didn't see you there within the first 10 minutes:</p>
       <div style="background: ${BG_COLOR}; padding: 20px; border-radius: 8px; margin: 24px 0;">
         <p style="margin: 0; font-size: 16px; font-weight: 700;">{{eventName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #3E5363;">{{startTime}} ({{timezone}})</p>
         <p style="margin: 8px 0 0; font-size: 14px; color: #3E5363;"><strong>Coach:</strong> {{coachName}}</p>
       </div>
       <div style="background: #FFF9E6; border-left: 4px solid #FFC107; padding: 16px; margin: 24px 0; border-radius: 4px;">
         <p style="margin: 0; font-size: 14px; color: #856404;"><strong>Note:</strong> Our policy requires students to join within the first 10 minutes of the scheduled start time.</p>
       </div>
       <p>If you believe this is a mistake, please contact your coach or reach out to our support team.</p>`
    ),
    attachmentRequired: false,
  },
  TEAM_BOOKING_CONFIRMED: {
    subject: "🏢 Team Update: New Booking ({{eventName}})",
    text: "A new booking has been created for {{teamName}}. Student: {{studentName}}. Coach: {{coachName}}. Time: {{startTime}} ({{timezone}}).",
    html: wrapLayout(
      "A new booking for {{teamName}}",
      `<p>A new session has been added to your team's schedule.</p>
       <div style="background: ${BG_COLOR}; padding: 20px; border-radius: 8px; margin: 24px 0;">
         <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #8C99A3; font-weight: 700;">Session Breakdown</p>
         <p style="margin: 12px 0 4px; font-size: 14px;"><strong>Event:</strong> {{eventName}}</p>
         <p style="margin: 0 0 4px; font-size: 14px;"><strong>Student:</strong> {{studentName}}</p>
         <p style="margin: 0 0 4px; font-size: 14px;"><strong>Coach:</strong> {{coachName}}</p>
         <p style="margin: 0 0 4px; font-size: 14px;"><strong>Time:</strong> {{startTime}} ({{timezone}})</p>
       </div>
       <div style="margin: 24px 0; border: 1px solid #EDEDED; border-radius: 8px; padding: 20px;">
         <p style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; color: #8C99A3; font-weight: 700;">Student Inquiry Details</p>
         <p style="margin: 0 0 8px; font-size: 14px;"><strong>Question:</strong> {{specificQuestion}}</p>
         <p style="margin: 0 0 8px; font-size: 14px;"><strong>Tried Solutions:</strong> {{triedSolutions}}</p>
         <p style="margin: 0; font-size: 14px;"><strong>Used Resources:</strong> {{usedResources}}</p>
       </div>`
    ),
    attachmentRequired: false,
  },
  TEAM_BOOKING_CANCELLED: {
    subject: "🏢 Team Update: Session Cancelled ({{eventName}})",
    text: "A booking for {{teamName}} / {{eventName}} scheduled at {{startTime}} ({{timezone}}) has been cancelled.",
    html: wrapLayout(
      "Team session cancelled",
      `<p>This is a notification for <strong>{{teamName}}</strong>.</p>
       <p>The following session has been cancelled:</p>
       <div style="background: #FFF0F0; padding: 20px; border-radius: 8px; border: 1px solid #FFDada; margin: 24px 0;">
         <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #C0392B; font-weight: 700;">Cancelled Team Session</p>
         <p style="margin: 8px 0 0; font-size: 18px; font-weight: 700; color: #C0392B;">{{eventName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #D98880;">{{startTime}} ({{timezone}})</p>
         <p style="margin: 12px 0 0; font-size: 14px; color: #3E5363;"><strong>Student:</strong> {{studentName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #3E5363;"><strong>Coach:</strong> {{coachName}}</p>
       </div>`
    ),
    attachmentRequired: false,
  },
  TEAM_BOOKING_NO_SHOW: {
    subject: "🏢 Team Update: No-Show ({{eventName}})",
    text: "A booking for {{teamName}} / {{eventName}} at {{startTime}} ({{timezone}}) has been marked as a no-show.",
    html: wrapLayout(
      "Team Update: No-Show",
      `<p>A session within <strong>{{teamName}}</strong> has been marked as a **no-show**.</p>
       <div style="background: ${BG_COLOR}; padding: 20px; border-radius: 8px; margin: 24px 0;">
         <p style="margin: 0; font-size: 16px; font-weight: 700;">{{eventName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #3E5363;">{{startTime}} ({{timezone}})</p>
         <p style="margin: 8px 0 0; font-size: 14px; color: #3E5363;"><strong>Student:</strong> {{studentName}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; color: #3E5363;"><strong>Coach:</strong> {{coachName}}</p>
       </div>
       <div style="background: #FFF9E6; border-left: 4px solid #FFC107; padding: 16px; margin: 24px 0; border-radius: 4px;">
         <p style="margin: 0; font-size: 14px; color: #856404;"><strong>Note:</strong> The student did not join within the required 10-minute arrival window.</p>
       </div>`
    ),
    attachmentRequired: false,
  },
  SESSION_REMINDER_24H: {
    subject: "⏰ Tomorrow: Your session for {{eventName}} starts soon!",
    text: "Hi {{studentName}}, this is a reminder that your session for {{eventName}} is scheduled for tomorrow at {{startTime}}.",
    html: wrapLayout(
      "Your session starts in 24 hours",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>This is a friendly reminder that your session for <strong>{{eventName}}</strong> is coming up tomorrow.</p>
       <div style="background: ${BG_COLOR}; padding: 20px; border-radius: 8px; margin: 24px 0;">
         <p style="margin: 0 0 4px; font-size: 14px;"><strong>Coach:</strong> {{coachName}}</p>
         <p style="margin: 0 0 12px; font-size: 14px;"><strong>Time:</strong> {{startTime}} ({{timezone}})</p>
         <p style="margin: 0; font-size: 14px;">Join using the link below:</p>
       </div>`,
      { text: "Join Meeting", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
  SESSION_REMINDER_1H: {
    subject: "⚡ Starting Soon: {{eventName}} begins in 1 hour",
    text: "Hi {{studentName}}, your session for {{eventName}} starts in about 1 hour at {{startTime}}.",
    html: wrapLayout(
      "Almost time to start!",
      `<p>Hi <strong>{{studentName}}</strong>,</p>
       <p>Your session for <strong>{{eventName}}</strong> with <strong>{{coachName}}</strong> starts in just <strong>1 hour</strong>.</p>
       <div style="background: ${BRAND_DARK}; color: #ffffff; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
         <p style="margin: 0; font-size: 20px; font-weight: 700;">{{startTime}}</p>
         <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.8;">{{timezone}}</p>
       </div>`,
      { text: "Join Now", url: "{{meetingJoinUrl}}" }
    ),
    attachmentRequired: false,
  },
};

export default emailTemplates;

import type { EmailTemplateMap } from "../types/notification";
import { wrapLayout } from "./layout";

export const inviteTemplates: EmailTemplateMap = {
  USER_INVITED: {
    subject: "You've been invited: Chegg Scheduling App",
    preheader: "You have a pending invitation — accept it before it expires.",
    text: "You have been invited as a {{role}}. {{authNote}} Use this link to accept your invite: {{inviteUrl}}. This invite expires on {{expiresAt}}.",
    html: wrapLayout(
      "Invitation to join the team",
      `<p>Hi there,</p>
       <p>You've been invited to join the <strong>Chegg Scheduling App</strong> as a <strong>{{role}}</strong>.</p>
       <p>{{authNote}}</p>
       <p>This invitation will expire on <strong>{{expiresAt}}</strong>.</p>`,
      "You have a pending invitation — accept it before it expires.",
      { text: "Accept Invitation", url: "{{inviteUrl}}" },
    ),
  },

  INVITE_ACCEPTED: {
    subject: "Invite Accepted: {{inviteeName}}",
    preheader: "{{inviteeName}} has joined the application.",
    text: "{{inviteeName}} ({{inviteeEmail}}) has accepted the invite and joined as a {{role}}.",
    html: wrapLayout(
      "Invitation Accepted",
      `<p><strong>{{inviteeName}}</strong> ({{inviteeEmail}}) has successfully joined the application.</p>
       <p style="margin-top: 16px;"><strong>Assigned Role:</strong> {{role}}</p>`,
      "{{inviteeName}} has joined the application.",
    ),
  },
};

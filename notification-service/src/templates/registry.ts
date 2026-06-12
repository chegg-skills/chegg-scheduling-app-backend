import { bookingTemplates } from "./booking";
import { coachTemplates } from "./coach";
import { inviteTemplates } from "./invite";
import { reminderTemplates } from "./reminders";
import { teamTemplates } from "./team";
import type { EmailTemplate, EmailTemplateMap, NotificationType } from "../types/notification";

export const emailTemplates: EmailTemplateMap = {
  ...inviteTemplates,
  ...teamTemplates,
  ...bookingTemplates,
  ...coachTemplates,
  ...reminderTemplates,
};

// Compile-time exhaustiveness check: if a NotificationType is added to the union
// without a corresponding template entry, this line will produce a type error.
// Control messages (CANCEL_*) are intentionally omitted — they carry no email template.
type ControlMessages = "CANCEL_BOOKING_REMINDERS" | "CANCEL_EVENT_LINK_EXPIRY_REMINDER";
const _exhaustivenessCheck: Omit<
  Record<NotificationType, EmailTemplate>,
  ControlMessages
> = emailTemplates as Omit<Record<NotificationType, EmailTemplate>, ControlMessages>;
void _exhaustivenessCheck;

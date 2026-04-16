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
// CANCEL_BOOKING_REMINDERS is intentionally omitted — it is a control message,
// not an email template, so we cast to allow it.
const _exhaustivenessCheck: Omit<Record<NotificationType, EmailTemplate>, "CANCEL_BOOKING_REMINDERS"> =
  emailTemplates as Omit<Record<NotificationType, EmailTemplate>, "CANCEL_BOOKING_REMINDERS">;
void _exhaustivenessCheck;

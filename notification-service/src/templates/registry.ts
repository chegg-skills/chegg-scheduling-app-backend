import { bookingTemplates } from "./booking";
import { coachTemplates } from "./coach";
import { inviteTemplates } from "./invite";
import { reminderTemplates } from "./reminders";
import { teamTemplates } from "./team";
import type { EmailTemplate, EmailTemplateMap, NotificationType } from "../types/notification";

// Control messages carry no email template — they instruct the notification-service
// to cancel previously-scheduled notifications rather than send a new one.
type ControlMessages = "CANCEL_BOOKING_REMINDERS" | "CANCEL_EVENT_LINK_EXPIRY_REMINDER";

// Real compile-time exhaustiveness check. Each domain map above is declared with
// `satisfies Partial<Record<NotificationType, EmailTemplate>>` (not a widened
// EmailTemplateMap annotation), which preserves its literal key set instead of
// collapsing to a generic string index. Merging them here and checking the result
// against `Record<Exclude<NotificationType, ControlMessages>, EmailTemplate>` means
// a NotificationType added without a template entry in one of the domain maps is a
// genuine tsc error at this declaration — not just a runtime assertion in
// registry.test.ts (which still exists as a second, independent check).
const templates = {
  ...inviteTemplates,
  ...teamTemplates,
  ...bookingTemplates,
  ...coachTemplates,
  ...reminderTemplates,
} satisfies Record<Exclude<NotificationType, ControlMessages>, EmailTemplate>;

// Exported as the wider EmailTemplateMap so callers (renderer.ts's renderTemplate,
// which accepts an arbitrary runtime string type and throws if not found) can index
// it with a plain string, not just a literal NotificationType.
export const emailTemplates: EmailTemplateMap = templates;

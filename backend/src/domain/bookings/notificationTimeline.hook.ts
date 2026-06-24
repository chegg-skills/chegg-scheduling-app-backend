import { BookingActivityType, BookingActivityActor } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { logger } from "../../shared/logging/logger";
import { recordBookingActivity } from "./bookingActivity.service";
import type { EnqueuedNotification } from "../../shared/notifications/notification.publisher";

// Reminder types are scheduled for the future, not sent now — when they reach this hook
// (only ever for an immediate, non-deferred send) they classify as REMINDER_SENT; every
// other booking notification is an EMAIL_SENT.
const SESSION_REMINDER_TYPES = new Set<string>([
  "SESSION_REMINDER_24H",
  "SESSION_REMINDER_12H",
  "SESSION_REMINDER_6H",
  "SESSION_REMINDER_1H",
  "SESSION_REMINDER_ANONYMOUS_24H",
  "SESSION_REMINDER_ANONYMOUS_12H",
  "SESSION_REMINDER_ANONYMOUS_6H",
  "SESSION_REMINDER_ANONYMOUS_1H",
  "ANONYMOUS_BOOKING_POOL_REMINDER",
]);

/**
 * Records a booking-timeline entry when a notification is actually sent to a recipient.
 * Registered with the notification publisher at startup (see server.ts) so the shared
 * publisher never imports domain code. Best-effort — a failure here must never affect
 * the notification enqueue path.
 *
 * `deferred` notifications (control messages + future-dated reminders) are skipped:
 * they are not an actual email to a recipient, so recording them as "sent" would be a lie.
 */
export const recordBookingNotificationActivity = async (
  event: EnqueuedNotification,
): Promise<void> => {
  if (event.deferred) return;
  if (event.entityType !== "BOOKING" || !event.entityId) return;

  const activityType = SESSION_REMINDER_TYPES.has(event.type)
    ? BookingActivityType.REMINDER_SENT
    : BookingActivityType.EMAIL_SENT;

  try {
    await recordBookingActivity(
      prisma,
      event.entityId,
      activityType,
      BookingActivityActor.SYSTEM,
      null,
      "System",
      {
        recipient: event.recipients,
        notificationType: event.type,
        recipientRole: event.recipientRole || "UNKNOWN",
      },
    );
  } catch (error) {
    logger.error(
      { error, bookingId: event.entityId, notificationType: event.type },
      "Failed to log notification to booking timeline.",
    );
  }
};

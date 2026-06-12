import { getChannel } from "../channels/registry";
import { cancelNotificationsByEntity } from "../services/notificationRepository";
import type { NotificationPayload } from "../types/notification";
import { logger } from "../logger";

export async function processNotification(notification: NotificationPayload): Promise<void> {
  if (notification.type === "CANCEL_BOOKING_REMINDERS") {
    if (!notification.entityId) {
      logger.warn("CANCEL_BOOKING_REMINDERS received without entityId — skipping.");
      return;
    }

    await cancelNotificationsByEntity(notification.entityType ?? "BOOKING", notification.entityId);
    return;
  }

  if (notification.type === "CANCEL_EVENT_LINK_EXPIRY_REMINDER") {
    if (!notification.entityId) {
      logger.warn("CANCEL_EVENT_LINK_EXPIRY_REMINDER received without entityId — skipping.");
      return;
    }

    await cancelNotificationsByEntity("Event", notification.entityId);
    return;
  }

  const channel = getChannel("email");
  if (!channel) {
    throw new Error("No channel found for type: email");
  }

  await channel.send(notification);
}

import { config } from "../config/env";
import { findDueScheduledNotifications } from "./notificationRepository";
import { sendStoredNotification } from "./notificationService";

export async function processScheduledNotifications(
  limit = config.scheduler.batchSize,
): Promise<number> {
  const dueNotifications = await findDueScheduledNotifications(limit);

  for (const record of dueNotifications) {
    await sendStoredNotification(record);
  }

  return dueNotifications.length;
}

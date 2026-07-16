import * as Sentry from "@sentry/node";
import { config } from "../config/env";
import {
  claimDueScheduledNotifications,
  reclaimStaleSendingNotifications,
} from "./notificationRepository";
import { sendStoredNotification } from "./notificationService";
import { logger } from "../logger";

export async function processScheduledNotifications(
  limit = config.scheduler.batchSize,
): Promise<number> {
  // Recover any rows orphaned in SENDING by a crashed instance, then atomically claim
  // this batch so a co-running instance can't grab the same rows (FOR UPDATE SKIP LOCKED).
  await reclaimStaleSendingNotifications();
  const dueNotifications = await claimDueScheduledNotifications(limit);

  for (const record of dueNotifications) {
    // Isolate per-row failures so one bad send doesn't abort the rest of the sweep.
    try {
      await sendStoredNotification(record, { allowSchedulerRetry: true });
    } catch (error) {
      logger.error(
        { error, notificationId: record.id, notificationType: record.notificationType },
        "Scheduled notification send failed.",
      );
      Sentry.captureException(error, {
        tags: { notificationId: String(record.id), notificationType: record.notificationType },
      });
    }
  }

  return dueNotifications.length;
}

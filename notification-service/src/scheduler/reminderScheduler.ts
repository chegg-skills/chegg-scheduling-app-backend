import * as Sentry from "@sentry/node";
import { config } from "../config/env";
import { processScheduledNotifications } from "../services/scheduledNotificationService";
import { logger } from "../logger";

let reminderTimer: NodeJS.Timeout | null = null;
let sweepInProgress = false;

const runReminderSweep = async (): Promise<void> => {
  if (sweepInProgress) return;

  sweepInProgress = true;

  try {
    const processedCount = await processScheduledNotifications();
    if (processedCount > 0) {
      logger.info({ processedCount }, "Reminder scheduler sweep completed.");
    }
  } catch (error) {
    logger.error({ error }, "Reminder scheduler sweep failed.");
    Sentry.captureException(error);
  } finally {
    sweepInProgress = false;
  }
};

function startReminderScheduler(): () => void {
  if (!config.scheduler.enabled) {
    logger.info("Reminder scheduler is disabled by configuration.");
    return () => {};
  }

  const { intervalMs } = config.scheduler;

  void runReminderSweep();

  reminderTimer = setInterval(() => {
    void runReminderSweep();
  }, intervalMs);

  reminderTimer.unref?.();

  logger.info({ intervalMs }, "Reminder scheduler started.");

  return () => {
    if (reminderTimer) {
      clearInterval(reminderTimer);
      reminderTimer = null;
    }
  };
}

export { startReminderScheduler };

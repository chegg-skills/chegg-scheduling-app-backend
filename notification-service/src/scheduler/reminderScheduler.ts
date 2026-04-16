import { config } from "../config/env";
import { processScheduledNotifications } from "../services/scheduledNotificationService";

let reminderTimer: NodeJS.Timeout | null = null;
let sweepInProgress = false;

const runReminderSweep = async (): Promise<void> => {
  if (sweepInProgress) return;

  sweepInProgress = true;

  try {
    const processedCount = await processScheduledNotifications();
    if (processedCount > 0) {
      console.log(`Processed ${processedCount} due scheduled notification(s).`);
    }
  } catch (error) {
    console.error("Reminder scheduler sweep failed:", error);
  } finally {
    sweepInProgress = false;
  }
};

function startReminderScheduler(): () => void {
  if (!config.scheduler.enabled) {
    console.log("Reminder scheduler is disabled by configuration.");
    return () => {};
  }

  const { intervalMs } = config.scheduler;

  void runReminderSweep();

  reminderTimer = setInterval(() => {
    void runReminderSweep();
  }, intervalMs);

  reminderTimer.unref?.();

  console.log(`Reminder scheduler started. Polling every ${intervalMs}ms.`);

  return () => {
    if (reminderTimer) {
      clearInterval(reminderTimer);
      reminderTimer = null;
    }
  };
}

export { startReminderScheduler };

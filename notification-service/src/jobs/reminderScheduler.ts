import { processScheduledNotifications } from "../services/emailService";

let reminderTimer: NodeJS.Timeout | null = null;

const runReminderSweep = async (): Promise<void> => {
  try {
    const processedCount = await processScheduledNotifications();

    if (processedCount > 0) {
      console.log(`Processed ${processedCount} due scheduled notification(s).`);
    }
  } catch (error) {
    console.error("Reminder scheduler sweep failed:", error);
  }
};

function startReminderScheduler(): () => void {
  if (process.env.REMINDER_SCHEDULER_ENABLED === "false") {
    console.log("Reminder scheduler is disabled by configuration.");
    return () => {};
  }

  const intervalMs = Number(process.env.REMINDER_SCHEDULER_INTERVAL_MS ?? 60_000);

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

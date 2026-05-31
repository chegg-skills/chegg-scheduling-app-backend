import { prisma } from "../db/prisma";
import { startDLQConsumer } from "../consumers/dlqConsumer";
import { startNotificationConsumer } from "../consumers/notificationConsumer";
import { startReminderScheduler } from "../scheduler/reminderScheduler";
import { config } from "../config/env";
import { createHealthServer } from "./healthServer";
import { logger } from "../logger";

export async function bootstrap(): Promise<void> {
  logger.info(
    { nodeEnv: process.env.NODE_ENV, dbConfigured: !!process.env.DATABASE_URL },
    "Notification service starting.",
  );

  const healthServer = createHealthServer();
  let stopReminderScheduler: () => void = () => {};

  const shutdown = (): void => {
    logger.info("Shutdown signal received.");
    stopReminderScheduler();
    healthServer.close();
    void prisma.$disconnect().finally(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const startupTimeout = setTimeout(() => {
    logger.fatal({ timeoutMs: config.startup.timeoutMs }, "Startup timed out — exiting.");
    process.exit(1);
  }, config.startup.timeoutMs);

  const results = await Promise.allSettled([startNotificationConsumer(), startDLQConsumer()]);

  clearTimeout(startupTimeout);

  const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

  if (failed.length > 0) {
    logger.fatal(
      { errors: failed.map((r) => r.reason) },
      "Failed to start consumers.",
    );
    process.exit(1);
  }

  stopReminderScheduler = startReminderScheduler();
  logger.info("Notification service started successfully.");
}

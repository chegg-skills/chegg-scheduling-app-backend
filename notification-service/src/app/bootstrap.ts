import { prisma } from "../db/prisma";
import { startDLQConsumer } from "../consumers/dlqConsumer";
import { startNotificationConsumer } from "../consumers/notificationConsumer";
import { startReminderScheduler } from "../scheduler/reminderScheduler";
import { config } from "../config/env";
import { createHealthServer } from "./healthServer";
import { logger } from "../logger";

/**
 * Fail fast on missing configuration with a clear message, before opening any
 * connection — rather than surfacing an opaque error on the first DB/RabbitMQ/SMTP use.
 */
const validateConfig = (): void => {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!process.env.RABBITMQ_URL) missing.push("RABBITMQ_URL");

  // Email transport: either an SMTP host, or a service username + password.
  const hasSmtp = !!process.env.SMTP_HOST;
  const hasServiceCreds = !!process.env.EMAIL_USERNAME && !!process.env.EMAIL_PASSWORD;
  if (!hasSmtp && !hasServiceCreds) {
    missing.push("SMTP_HOST or (EMAIL_USERNAME and EMAIL_PASSWORD)");
  }

  if (missing.length > 0) {
    logger.fatal({ missing }, "Missing required configuration — exiting.");
    throw new Error(`Missing required environment configuration: ${missing.join(", ")}`);
  }
};

export async function bootstrap(): Promise<void> {
  validateConfig();

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

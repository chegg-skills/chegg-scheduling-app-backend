import { prisma } from "../db/prisma";
import { startDLQConsumer } from "../consumers/dlqConsumer";
import { startNotificationConsumer } from "../consumers/notificationConsumer";
import { startReminderScheduler } from "../scheduler/reminderScheduler";
import { config } from "../config/env";
import { createHealthServer } from "./healthServer";

console.log("-----------------------------------------");
console.log("NOTIFICATION SERVICE STARTUP");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
console.log(
  "DATABASE_URL:",
  process.env.DATABASE_URL
    ? "SET (ends in " + process.env.DATABASE_URL.slice(-10) + ")"
    : "NOT SET",
);
console.log("-----------------------------------------");

export async function bootstrap(): Promise<void> {
  const healthServer = createHealthServer();
  let stopReminderScheduler: () => void = () => {};

  const shutdown = (): void => {
    console.log("Received shutdown signal. Shutting down...");
    stopReminderScheduler();
    healthServer.close();
    void prisma.$disconnect().finally(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const startupTimeout = setTimeout(() => {
    console.error(`Startup timed out after ${config.startup.timeoutMs}ms. Exiting.`);
    process.exit(1);
  }, config.startup.timeoutMs);

  const results = await Promise.allSettled([startNotificationConsumer(), startDLQConsumer()]);

  clearTimeout(startupTimeout);

  const failed = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );

  if (failed.length > 0) {
    console.error(
      "Error starting consumers:",
      failed.map((r) => r.reason),
    );
    process.exit(1);
  }

  stopReminderScheduler = startReminderScheduler();
  console.log("Notification consumers and reminder scheduler started successfully.");
}

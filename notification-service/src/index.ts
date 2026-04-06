import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { startDLQConsumer } from "./jobs/dlqConsumer";
import { startNotificationConsumer } from "./jobs/notificationConsumer";
import { startReminderScheduler } from "./jobs/reminderScheduler";


const prisma = new PrismaClient();

console.log("-----------------------------------------");
console.log("NOTIFICATION SERVICE STARTUP");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET (ends in " + process.env.DATABASE_URL.slice(-10) + ")" : "NOT SET");
console.log("-----------------------------------------");

let stopReminderScheduler: () => void = () => { };

async function startAllConsumers(): Promise<void> {
  const results = await Promise.allSettled([
    startNotificationConsumer(),
    startDLQConsumer(),
  ]);

  const failed = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );

  if (failed.length > 0) {
    console.error(
      "Error starting consumers:",
      failed.map((result) => result.reason),
    );
    process.exit(1);
  }

  stopReminderScheduler = startReminderScheduler();
  console.log("Notification consumers and reminder scheduler started successfully.");
}

const shutdown = (): void => {
  console.log("Received shutdown signal. Shutting down...");
  stopReminderScheduler();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void startAllConsumers();

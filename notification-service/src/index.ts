import "./instrument"; // must be first — instruments Node.js internals before other imports
import "dotenv/config";
import * as Sentry from "@sentry/node";
import { bootstrap } from "./app/bootstrap";
import { logger } from "./logger";

bootstrap().catch((err: unknown) => {
  logger.fatal({ error: err }, "Fatal startup error.");
  Sentry.captureException(err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ reason }, "Unhandled promise rejection — process will exit.");
  Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)));
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception — process will exit.");
  Sentry.captureException(error);
  process.exit(1);
});

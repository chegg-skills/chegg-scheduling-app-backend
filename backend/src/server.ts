// Must be first: initializes Sentry (no-op without SENTRY_DSN) before other
// modules are required so it can instrument them.
import "./instrument";
import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import { prisma } from "./shared/db/prisma";
import { logger } from "./shared/logging/logger";
import { getOidcClient } from "./shared/auth/oidcClient";
import { startFeedbackConsumer } from "./shared/notifications/communication.feedback";

const validateEnv = (): void => {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (process.env.JWT_SECRET === "replace-this-with-a-long-random-secret") {
    if (isProduction) {
      throw new Error(
        "JWT_SECRET is still the placeholder value. Set a strong secret before deploying.",
      );
    }
    logger.warn(
      "JWT_SECRET is still set to the placeholder value. Replace it before production deployment.",
    );
  }

  if (isProduction && process.env.ENABLE_CSRF_PROTECTION !== "true") {
    throw new Error("ENABLE_CSRF_PROTECTION must be 'true' in production.");
  }
};

const start = async (): Promise<void> => {
  validateEnv();

  // Fail fast on OIDC misconfiguration rather than surfacing a 500 on first SSO login
  if (process.env.OIDC_ISSUER_URL) {
    await getOidcClient();
    logger.info("OIDC client initialized.");
  }

  // Start the background RabbitMQ consumer to process delivery feedback status
  await startFeedbackConsumer();

  // Verify DB is reachable before accepting traffic — fail fast rather than serving requests
  // that immediately hit connection errors.
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connection verified.");
  } catch (error) {
    logger.fatal({ error }, "Database connection failed on startup — cannot serve requests.");
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 4000;

  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening.");
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutdown signal received.");
    server.close(async () => {
      logger.info("HTTP server closed. Disconnecting database...");
      await prisma.$disconnect();
      logger.info("Database disconnected. Exiting.");
      process.exit(0);
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((error) => {
  logger.fatal({ error }, "Server startup failed.");
  process.exit(1);
});

// Catch synchronous throws that escape all try/catch blocks.
// Log at fatal because the process is in an unknown state and will exit.
process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception — process will exit.");
  process.exit(1);
});

// Catch Promise rejections that were never .catch()-ed.
// Treat as fatal: unhandled rejections indicate a programming error.
process.on("unhandledRejection", (reason) => {
  logger.fatal(
    { reason: reason instanceof Error ? reason : { value: String(reason) } },
    "Unhandled promise rejection — process will exit.",
  );
  process.exit(1);
});

// Route Node.js process warnings (DeprecationWarning, ExperimentalWarning, etc.)
// through pino so they appear in the structured log stream rather than raw stderr.
process.on("warning", (warning) => {
  logger.warn(
    { name: warning.name, message: warning.message, stack: warning.stack },
    "Node.js process warning.",
  );
});

// Force hot-reload to load fresh Prisma Client with updated database schema (Reloaded: 2026-05-28)

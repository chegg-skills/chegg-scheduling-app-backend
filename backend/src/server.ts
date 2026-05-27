import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import { prisma } from "./shared/db/prisma";
import { logger } from "./shared/logging/logger";
import { getOidcClient } from "./shared/utils/oidcClient";
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

  const port = Number(process.env.PORT) || 4000;

  const server = app.listen(port, () => {
    logger.info("Server listening", { port });
  });

  const shutdown = (signal: string) => {
    logger.info("Shutdown signal received", { signal });
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
};

start().catch((error) => {
  logger.error("Server startup failed.", { error });
  process.exit(1);
});

// Force hot-reload to load fresh Prisma Client with updated database schema

import dotenv from "dotenv";

dotenv.config();

import app from "./app";
import { prisma } from "./shared/db/prisma";
import { logger } from "./shared/logging/logger";

const validateEnv = (): void => {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if (process.env.JWT_SECRET === "replace-this-with-a-long-random-secret") {
    logger.warn(
      "JWT_SECRET is still set to the placeholder value. Replace it before production deployment.",
    );
  }
};

validateEnv();

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

process.once("SIGINT", () => {
  shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  shutdown("SIGTERM");
});

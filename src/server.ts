import "dotenv/config";

import app from "./app";
import { prisma } from "./shared/db/prisma";

const validateEnv = (): void => {
  const required = ["DATABASE_URL", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }
  if (
    process.env.JWT_SECRET === "replace-this-with-a-long-random-secret"
  ) {
    console.warn(
      "WARNING: JWT_SECRET is still the default placeholder. Set a strong secret before deploying to production."
    );
  }
};

validateEnv();

const port = Number(process.env.PORT) || 4000;

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const shutdown = (signal: string) => {
  console.log(`${signal} received. Shutting down server.`);

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
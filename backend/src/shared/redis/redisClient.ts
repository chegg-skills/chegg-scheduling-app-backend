// No-op unless REDIS_URL is set. When absent (local dev, test), all callers
// receive null and fall back to their default in-memory behaviour.
import Redis from "ioredis";
import * as Sentry from "@sentry/node";
import { logger } from "../logging/logger";
import { isSentryEnabled } from "../../instrument";

let client: Redis | null = null;

export const getRedisClient = (): Redis | null => {
  if (!process.env.REDIS_URL) return null;

  if (!client) {
    client = new Redis(process.env.REDIS_URL, {
      // Queue commands during transient reconnects instead of failing immediately.
      maxRetriesPerRequest: null,
      // Don't block startup waiting for a Redis PING/PONG handshake.
      enableReadyCheck: false,
      // Don't open the TCP connection until the first command is issued.
      lazyConnect: true,
    });

    client.on("error", (err: Error) => {
      logger.error({ service: "redis", err: err.message }, "Redis connection error.");
      if (isSentryEnabled()) {
        Sentry.captureException(err, { tags: { service: "redis" } });
      }
    });

    client.on("ready", () => {
      logger.info({ service: "redis" }, "Redis connection established.");
    });
  }

  return client;
};

export const closeRedisClient = async (): Promise<void> => {
  if (client) {
    await client.quit();
    client = null;
  }
};

import { logger } from "../logging/logger";
import { purgeExpiredRefreshTokens } from "./refreshTokenUtils";

/**
 * Periodic sweep of expired `RefreshToken` rows.
 *
 * Runs on a fixed interval rather than opportunistically inside `refresh` — see
 * `purgeExpiredRefreshTokens`'s docstring for why the per-request version scaled
 * badly with active-session count.
 */

const CLEANUP_INTERVAL_MS = Number(
  process.env.REFRESH_TOKEN_CLEANUP_INTERVAL_MS ?? 60 * 60 * 1000, // hourly
);

const runCleanup = async (): Promise<void> => {
  try {
    const count = await purgeExpiredRefreshTokens();
    if (count > 0) {
      logger.info({ count }, "Refresh token cleanup: purged expired rows.");
    }
  } catch (error) {
    logger.error({ error }, "Refresh token cleanup failed.");
  }
};

/**
 * Starts the interval and returns a stop function. Called only from server.ts, so
 * tests (which import `app`, not `server`) never start it.
 */
export const startRefreshTokenCleanupWorker = (): (() => void) => {
  const interval = setInterval(() => {
    void runCleanup();
  }, CLEANUP_INTERVAL_MS);
  interval.unref?.(); // don't keep the event loop alive for cleanup alone

  logger.info({ intervalMs: CLEANUP_INTERVAL_MS }, "Refresh token cleanup worker started.");

  return () => {
    clearInterval(interval);
    logger.info("Refresh token cleanup worker stopped.");
  };
};

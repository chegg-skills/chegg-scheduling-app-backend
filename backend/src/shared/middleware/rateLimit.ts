import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../redis/redisClient";

// Returns a Redis-backed store when REDIS_URL is set (production), or undefined
// which makes express-rate-limit fall back to its default in-memory store (dev/test).
const buildStore = (prefix: string) => {
  const redis = getRedisClient();
  if (!redis) return undefined;
  return new RedisStore({
    // ioredis call() returns Promise<unknown>; rate-limit-redis expects Promise<RedisReply>.
    // The runtime values are compatible — the cast bridges the type mismatch only.
    sendCommand: (...args: string[]) =>
      redis.call(...(args as [string, ...string[]])) as ReturnType<RedisStore["sendCommand"]>,
    prefix: `rl:${prefix}:`,
  });
};

type RateLimitOptions = NonNullable<Parameters<typeof rateLimit>[0]>;

const isTestRuntime = process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
const isDevRuntime =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

const shouldBypassRateLimit =
  (isTestRuntime && process.env.ENABLE_RATE_LIMITS_IN_TEST !== "true") || isDevRuntime;

const withTestBypass = <T extends RateLimitOptions>(options: T): T => ({
  ...options,
  skip: (req, res) => {
    if (shouldBypassRateLimit) {
      return true;
    }

    return options.skip?.(req, res) ?? false;
  },
});

/**
 * Sensitive tier — brute-force targets: login, accept-invite.
 * Configurable via env; defaults to 10 requests per window.
 */
export const sensitiveLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("sensitive"),
    windowMs: Number(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS ?? 5 * 60 * 1000),
    max: Number(process.env.SENSITIVE_RATE_LIMIT_MAX ?? 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many attempts. Please try again later.",
    },
  }),
});

/**
 * Standard tier — general authenticated API routes.
 * Configurable via env; defaults to 1000 requests per window.
 */
export const standardLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("standard"),
    windowMs: Number(process.env.STANDARD_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.STANDARD_RATE_LIMIT_MAX ?? 1000),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please slow down.",
    },
  }),
});

/**
 * Strict tier — high-value one-time operations: password reset, OTP (future use).
 * Configurable via env; defaults to 5 requests per window.
 */
export const strictLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("strict"),
    windowMs: Number(process.env.STRICT_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.STRICT_RATE_LIMIT_MAX ?? 5),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many attempts. Please try again later.",
    },
  }),
});

/**
 * Public tier — unauthenticated discovery routes (/public/*).
 * Prevents bulk scraping of team/event/coach data.
 */
export const publicLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("public"),
    windowMs: Number(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.PUBLIC_RATE_LIMIT_MAX ?? 120),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please slow down.",
    },
  }),
});

/**
 * Booking creation tier — POST /bookings (public, unauthenticated).
 * Prevents flooding with fake bookings from a single IP.
 */
export const bookingCreationLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("booking"),
    windowMs: Number(process.env.BOOKING_CREATION_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.BOOKING_CREATION_RATE_LIMIT_MAX ?? 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many booking attempts. Please try again later.",
    },
  }),
});

/**
 * Session join tier — GET /public/bookings/:bookingId/join (public, unauthenticated).
 * Entropy of bookingId+sessionToken makes brute force infeasible regardless, but this
 * keeps probing/scanning traffic from sharing budget with legitimate public browsing.
 */
export const sessionJoinLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("session-join"),
    windowMs: Number(process.env.SESSION_JOIN_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    max: Number(process.env.SESSION_JOIN_RATE_LIMIT_MAX ?? 30),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: "Too many requests. Please try again later.",
    },
  }),
});

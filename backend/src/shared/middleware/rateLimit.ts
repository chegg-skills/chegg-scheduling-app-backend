import { createHash } from "node:crypto";
import type { Request } from "express";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../redis/redisClient";
import { REFRESH_COOKIE_NAME } from "../auth/cookie";

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
const isDevRuntime = process.env.NODE_ENV === "development";

// Dev always bypasses. Test bypasses too — unless ENABLE_RATE_LIMITS_IN_TEST=true,
// which lets integration tests exercise the limiter. (Previously `isDevRuntime`
// also covered "test", so the escape hatch could never take effect.) Production
// (NODE_ENV=production) never bypasses.
const shouldBypassRateLimit =
  isDevRuntime || (isTestRuntime && process.env.ENABLE_RATE_LIMITS_IN_TEST !== "true");

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

const REFRESH_LIMIT_MESSAGE = {
  success: false,
  message: "Too many refresh attempts. Please try again later.",
};

/**
 * Keys the per-session tier by the presented refresh cookie.
 *
 * Only the hash is used — the raw token would otherwise be written into a Redis key.
 * A caller with no cookie falls into one shared "anon" bucket; that is deliberate,
 * since a legitimate refresh always carries one.
 */
const refreshSessionKey = (req: Request): string => {
  const cookie = req.cookies?.[REFRESH_COOKIE_NAME];
  if (typeof cookie !== "string" || cookie.length === 0) return "anon";

  return createHash("sha256").update(cookie).digest("hex").slice(0, 32);
};

/**
 * Refresh tiers — both applied to POST /auth/refresh, because neither bounds the
 * other's abuse case.
 *
 * Per-session (this one) gives each session its own budget, so an office behind a
 * single NAT no longer shares one — IP-only keying signed the whole building out.
 * But it cannot bound a caller who sends a *different* random cookie every request:
 * each one hashes to a fresh key. Note a composite `ip:session` key does not fix
 * that either — it is still unique per token — which is why the IP tier below is a
 * genuinely separate limiter rather than part of this key.
 */
export const refreshLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("refresh"),
    windowMs: Number(process.env.REFRESH_RATE_LIMIT_WINDOW_MS ?? 5 * 60 * 1000),
    max: Number(process.env.REFRESH_RATE_LIMIT_MAX ?? 30),
    keyGenerator: refreshSessionKey,
    standardHeaders: true,
    legacyHeaders: false,
    message: REFRESH_LIMIT_MESSAGE,
  }),
});

/**
 * Per-IP ceiling for refresh, sized for a large shared network rather than a single
 * user: it exists to stop an unauthenticated flood of random cookies (each of which
 * costs a DB transaction), not to police normal use. A 100-person office refreshing
 * every 15 minutes produces roughly 35 requests per 5-minute window — an order of
 * magnitude below this — while a flood trips it immediately.
 */
export const refreshIpLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("refresh-ip"),
    windowMs: Number(process.env.REFRESH_IP_RATE_LIMIT_WINDOW_MS ?? 5 * 60 * 1000),
    max: Number(process.env.REFRESH_IP_RATE_LIMIT_MAX ?? 300),
    standardHeaders: true,
    legacyHeaders: false,
    message: REFRESH_LIMIT_MESSAGE,
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

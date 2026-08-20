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

const getRefreshCookie = (req: Request): string | undefined => {
  const cookie = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof cookie === "string" && cookie.length > 0 ? cookie : undefined;
};

/**
 * Keys the replay tier by the presented refresh cookie. Only the hash is used — the
 * raw token would otherwise be written into a Redis key.
 *
 * Cookie-less requests never reach here (see `skip` below), so there is no constant
 * fallback bucket for one caller to drain on everyone else's behalf.
 */
const refreshSessionKey = (req: Request): string =>
  createHash("sha256")
    .update(getRefreshCookie(req) ?? "")
    .digest("hex")
    .slice(0, 32);

/**
 * Refresh replay tier — applied to POST /auth/refresh alongside the IP tier below.
 *
 * Despite the per-session key, this is **replay protection, not a per-session
 * throughput budget**: rotation issues a new token on every success, so a working
 * session moves to a fresh empty bucket each time and can never fill one. What it
 * does bound is repeated presentation of one unchanging token — the theft-replay
 * case, which is exactly what reuse detection cares about.
 *
 * It therefore cannot bound a caller sending a *different* random cookie each
 * request; every token hashes to a new key. A composite `ip:session` key would not
 * help either — still unique per token — which is why the IP ceiling below is a
 * genuinely separate limiter and the real volumetric bound.
 */
export const refreshLimiter = rateLimit({
  ...withTestBypass({
    store: buildStore("refresh"),
    windowMs: Number(process.env.REFRESH_RATE_LIMIT_WINDOW_MS ?? 5 * 60 * 1000),
    max: Number(process.env.REFRESH_RATE_LIMIT_MAX ?? 30),
    keyGenerator: refreshSessionKey,
    // A cookie-less refresh is rejected before any DB work and has no token to
    // replay, so this tight tier has nothing to protect against. Metering it here
    // would cap legitimate expired-session traffic from a whole NAT at this tier's
    // limit rather than the far wider per-IP ceiling — and a 429 (unlike the 401
    // they should get) is treated as transient by the client, stranding the user.
    skip: (req) => getRefreshCookie(req) === undefined,
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

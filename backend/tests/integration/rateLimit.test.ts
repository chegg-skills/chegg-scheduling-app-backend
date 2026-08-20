import express from "express";
import type { RequestHandler } from "express";
import request from "supertest";

// The rate limiters read their config (bypass flag, per-tier max) once at module
// load. So we set env, then require the module inside jest.isolateModules to get
// a freshly-evaluated instance. Two instances are loaded: one with the limiter
// ENABLED (ENABLE_RATE_LIMITS_IN_TEST=true) and one BYPASSED (flag unset), to
// cover both the enforcement path and the normal test-bypass path.

// Keys this file mutates. We snapshot and restore each individually rather than
// reassigning process.env wholesale — replacing the special process.env object
// leaks the mutated values into later test files under a randomized run order.
const MUTATED_KEYS = [
  "REDIS_URL",
  "ENABLE_RATE_LIMITS_IN_TEST",
  "SENSITIVE_RATE_LIMIT_MAX",
  "STRICT_RATE_LIMIT_MAX",
  "BOOKING_CREATION_RATE_LIMIT_MAX",
  "PUBLIC_RATE_LIMIT_MAX",
  "REFRESH_RATE_LIMIT_MAX",
  "REFRESH_IP_RATE_LIMIT_MAX",
] as const;
const SAVED_ENV: Record<string, string | undefined> = {};

let sensitiveLimiter: RequestHandler;
let strictLimiter: RequestHandler;
let bookingCreationLimiter: RequestHandler;
let refreshLimiter: RequestHandler;
let refreshIpLimiter: RequestHandler;
let bypassedPublicLimiter: RequestHandler;

beforeAll(() => {
  for (const k of MUTATED_KEYS) SAVED_ENV[k] = process.env[k];

  delete process.env.REDIS_URL; // force the in-memory store — no external dependency

  // ── Enabled instance ──
  process.env.ENABLE_RATE_LIMITS_IN_TEST = "true";
  process.env.SENSITIVE_RATE_LIMIT_MAX = "3";
  process.env.STRICT_RATE_LIMIT_MAX = "2";
  process.env.BOOKING_CREATION_RATE_LIMIT_MAX = "2";
  process.env.REFRESH_RATE_LIMIT_MAX = "2";
  process.env.REFRESH_IP_RATE_LIMIT_MAX = "4";
  jest.isolateModules(() => {
    const mod = require("../../src/shared/middleware/rateLimit");
    sensitiveLimiter = mod.sensitiveLimiter;
    strictLimiter = mod.strictLimiter;
    bookingCreationLimiter = mod.bookingCreationLimiter;
    refreshLimiter = mod.refreshLimiter;
    refreshIpLimiter = mod.refreshIpLimiter;
  });

  // ── Bypassed instance (flag unset, low max to prove requests still pass) ──
  delete process.env.ENABLE_RATE_LIMITS_IN_TEST;
  process.env.PUBLIC_RATE_LIMIT_MAX = "2";
  jest.isolateModules(() => {
    bypassedPublicLimiter = require("../../src/shared/middleware/rateLimit").publicLimiter;
  });
});

afterAll(() => {
  // Restore each key so later test files (run in-band) see the original env.
  for (const k of MUTATED_KEYS) {
    if (SAVED_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = SAVED_ENV[k];
  }
});

const buildApp = (limiter: RequestHandler, path = "/hit"): express.Express => {
  const app = express();
  app.get(path, limiter, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
};

describe("rate limiting — enforcement (ENABLE_RATE_LIMITS_IN_TEST=true)", () => {
  it("allows up to the configured max, then returns 429 with the tier message", async () => {
    const app = buildApp(sensitiveLimiter);

    const first = await request(app).get("/hit");
    expect(first.status).toBe(200);
    expect(first.headers["ratelimit-limit"]).toBe("3"); // env override propagated

    // Two more within the budget.
    expect((await request(app).get("/hit")).status).toBe(200);
    expect((await request(app).get("/hit")).status).toBe(200);

    // The 4th exceeds max=3.
    const blocked = await request(app).get("/hit");
    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toBe("Too many attempts. Please try again later.");
    expect(blocked.headers["ratelimit-remaining"]).toBe("0");
    expect(blocked.headers["retry-after"]).toBeDefined();
  });

  it("gives each tier an independent budget", async () => {
    // strict (max 2) and booking (max 2) use separate stores, so exhausting one
    // must not consume the other's budget — even from the same client IP.
    const app = express();
    app.get("/strict", strictLimiter, (_req, res) => res.status(200).json({ ok: true }));
    app.get("/booking", bookingCreationLimiter, (_req, res) => res.status(200).json({ ok: true }));

    // Exhaust the strict tier.
    expect((await request(app).get("/strict")).status).toBe(200);
    expect((await request(app).get("/strict")).status).toBe(200);
    expect((await request(app).get("/strict")).status).toBe(429);

    // The booking tier is untouched by the strict exhaustion.
    const booking = await request(app).get("/booking");
    expect(booking.status).toBe(200);
    expect(booking.body.message).toBeUndefined();
  });
});

describe("refresh tiers — per-session budget plus per-IP ceiling", () => {
  const cookieParser = require("cookie-parser");

  const buildRefreshApp = (...limiters: RequestHandler[]): express.Express => {
    const app = express();
    app.use(cookieParser());
    app.post("/refresh", ...limiters, (_req, res) => res.status(200).json({ ok: true }));
    return app;
  };

  it("gives two sessions from the same IP independent budgets", async () => {
    const app = buildRefreshApp(refreshLimiter);
    const sessionA = ["refresh_token=aaaaaaaaaaaa"];
    const sessionB = ["refresh_token=bbbbbbbbbbbb"];

    // Exhaust session A (max 2)
    expect((await request(app).post("/refresh").set("Cookie", sessionA)).status).toBe(200);
    expect((await request(app).post("/refresh").set("Cookie", sessionA)).status).toBe(200);
    expect((await request(app).post("/refresh").set("Cookie", sessionA)).status).toBe(429);

    // Session B shares the IP but must not inherit A's exhaustion — this is the
    // office/NAT case where IP-only keying signed the whole building out.
    expect((await request(app).post("/refresh").set("Cookie", sessionB)).status).toBe(200);
  });

  it("bounds a flood of random tokens via the per-IP tier", async () => {
    // The session tier alone cannot catch this: every random cookie hashes to a
    // fresh key, so each request would get its own budget. Only a genuinely
    // IP-keyed limiter bounds it.
    const app = buildRefreshApp(refreshIpLimiter, refreshLimiter);

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/refresh")
        .set("Cookie", [`refresh_token=random-${i}`]);
      statuses.push(res.status);
    }

    expect(statuses).toContain(429);
  });
});

describe("rate limiting — bypass (flag unset)", () => {
  it("does not enforce limits in the test env when ENABLE_RATE_LIMITS_IN_TEST is unset", async () => {
    // publicLimiter was loaded with max=2 but no enable flag → skip() returns true,
    // so far more than 2 requests all succeed. This guards the bypass path (the
    // default for the rest of the test suite) against the enforcement fix.
    const app = buildApp(bypassedPublicLimiter);

    for (let i = 0; i < 6; i++) {
      const res = await request(app).get("/hit");
      expect(res.status).toBe(200);
    }
  });
});

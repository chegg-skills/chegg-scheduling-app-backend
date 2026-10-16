import request from "supertest";

// Rate limiters read their config once at module load and are bypassed under Jest, so
// load a fresh app with the limiter enabled and a tiny cap. Env keys are restored
// individually (not by reassigning process.env) so nothing leaks into other files.
const MUTATED_KEYS = [
  "REDIS_URL",
  "ENABLE_RATE_LIMITS_IN_TEST",
  "STANDARD_RATE_LIMIT_MAX",
] as const;
const SAVED_ENV: Record<string, string | undefined> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let app: any;

beforeAll(() => {
  for (const k of MUTATED_KEYS) SAVED_ENV[k] = process.env[k];
  delete process.env.REDIS_URL; // force the in-memory store
  process.env.ENABLE_RATE_LIMITS_IN_TEST = "true";
  process.env.STANDARD_RATE_LIMIT_MAX = "2";
  jest.isolateModules(() => {
    app = require("../../src/app").default;
  });
});

afterAll(() => {
  for (const k of MUTATED_KEYS) {
    if (SAVED_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = SAVED_ENV[k];
  }
});

describe("booking directory routes — rate limiting", () => {
  it("applies the standard limiter ahead of authentication", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await request(app).get("/api/booking-directories")).status);
    }
    // Unauthenticated: 401 until the cap (2) is exhausted, then 429.
    expect(statuses).toEqual([401, 401, 429, 429]);
  });
});

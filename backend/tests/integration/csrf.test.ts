import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { csrfProtection } from "../../src/shared/middleware/csrf";
import { errorHandler } from "../../src/shared/error/errorhandler";
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../../src/shared/auth/cookie";

// The real `csrfProtection` reads `ENABLE_CSRF_PROTECTION` once at module load;
// this guard fails fast if a future env change silently disables it (which would
// make every assertion below pass vacuously).
if (process.env.ENABLE_CSRF_PROTECTION === "false") {
  throw new Error("CSRF is disabled in this env; the csrf.test.ts assertions would be vacuous.");
}

// A minimal app wired with the SAME middleware chain the real app uses
// (cookieParser -> csrfProtection -> ... -> errorHandler). Dummy routes use the
// exact paths csrf.ts special-cases, so the real exempt-prefix logic is exercised.
const buildApp = () => {
  const app = express();
  app.use(cookieParser());
  app.use(csrfProtection);
  const ok = (_req: express.Request, res: express.Response) => res.status(200).json({ ok: true });
  app.post("/api/test", ok);
  app.get("/api/test", ok);
  app.post("/api/auth/login", ok); // auth-exempt (exact prefix)
  app.post("/api/auth/sso/callback", ok); // auth-exempt (prefix subpath)
  app.use(errorHandler);
  return app;
};

const app = buildApp();

// supertest sends one `Cookie` header; build it from name=value pairs.
const cookieHeader = (pairs: Record<string, string>): string =>
  Object.entries(pairs)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

const TOKEN = "csrf-token-abc123";

describe("csrfProtection middleware", () => {
  it("rejects an authed-cookie POST with no CSRF header (403)", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt" }));

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Invalid CSRF token.");
  });

  it("rejects when the header token does not match the cookie token (403)", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt", [CSRF_COOKIE_NAME]: TOKEN }))
      .set(CSRF_HEADER_NAME, "a-different-but-same-length-tok");

    expect(res.status).toBe(403);
  });

  it("rejects when the header and cookie tokens differ in length (403)", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt", [CSRF_COOKIE_NAME]: TOKEN }))
      .set(CSRF_HEADER_NAME, "short");

    expect(res.status).toBe(403);
  });

  it("rejects when the CSRF cookie is missing but the header is present (403)", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt" }))
      .set(CSRF_HEADER_NAME, TOKEN);

    expect(res.status).toBe(403);
  });

  it("passes when the double-submit tokens match (200)", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt", [CSRF_COOKIE_NAME]: TOKEN }))
      .set(CSRF_HEADER_NAME, TOKEN);

    expect(res.status).toBe(200);
  });

  it("accepts the x-xsrf-token header as a fallback (200)", async () => {
    const res = await request(app)
      .post("/api/test")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt", [CSRF_COOKIE_NAME]: TOKEN }))
      .set("x-xsrf-token", TOKEN);

    expect(res.status).toBe(200);
  });

  it("skips validation for requests with no auth cookie (Bearer-auth clients) (200)", async () => {
    // No auth cookie -> nothing to protect. This is why the existing Bearer-auth
    // integration tests never trip CSRF.
    const res = await request(app).post("/api/test");
    expect(res.status).toBe(200);
  });

  it("skips validation for safe methods even with an auth cookie (200)", async () => {
    const res = await request(app)
      .get("/api/test")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt" }));

    expect(res.status).toBe(200);
  });

  it("skips validation for the auth-exempt login route (200)", async () => {
    // Pre-auth routes mint a new session; there's no existing session to protect.
    const res = await request(app)
      .post("/api/auth/login")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt" }));

    expect(res.status).toBe(200);
  });

  it("skips validation for a subpath of an auth-exempt prefix (200)", async () => {
    const res = await request(app)
      .post("/api/auth/sso/callback")
      .set("Cookie", cookieHeader({ [AUTH_COOKIE_NAME]: "session-jwt" }));

    expect(res.status).toBe(200);
  });
});

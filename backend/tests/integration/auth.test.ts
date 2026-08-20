import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import jwt from "jsonwebtoken";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET ?? "test-bootstrap-secret-abc123";

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// POST /api/auth/bootstrap
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/bootstrap", () => {
  // Each test must start with an empty database
  beforeEach(clearTables);

  it("creates a SUPER_ADMIN when the database is empty", async () => {
    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      firstName: "First",
      lastName: "Admin",
      email: "bootstrap@test.com",
      password: "Admin1234",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe("SUPER_ADMIN");
    expect(typeof res.body.data.token).toBe("string");
    // password must never be returned
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 403 when a user already exists", async () => {
    // seed one user first
    await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      firstName: "First",
      lastName: "Admin",
      email: "first@test.com",
      password: "Admin1234",
    });

    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      firstName: "Second",
      lastName: "Admin",
      email: "second@test.com",
      password: "Admin1234",
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns 403 when the bootstrap secret is wrong", async () => {
    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: "totally-wrong-secret",
      firstName: "Hacker",
      lastName: "User",
      email: "hacker@test.com",
      password: "Admin1234",
    });

    expect(res.status).toBe(403);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/auth/bootstrap").send({
      bootstrapSecret: BOOTSTRAP_SECRET,
      // missing firstName, lastName, email, password
    });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/login", () => {
  const loginEmail = "loginuser@test.com";
  const loginPassword = "LoginUser1234";

  beforeAll(async () => {
    await clearTables();
    await bootstrapAdmin(loginEmail, loginPassword);
  });

  it("returns 200 with a JWT and safe user on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: loginEmail, password: loginPassword });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe(loginEmail);
    expect(res.body.data.user.role).toBe("SUPER_ADMIN");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 401 for a wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: loginEmail, password: "WrongPassword999" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 for an unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@nowhere.com", password: "SomePass123" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ password: "SomePass123" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: loginEmail });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/register", () => {
  let adminToken: string;
  let coachToken: string;

  beforeAll(async () => {
    await clearTables();
    const admin = await bootstrapAdmin("admin@register.com", "Admin1234");
    adminToken = admin.token;

    const coach = await registerUser(adminToken, {
      firstName: "Existing",
      lastName: "Coach",
      email: "coach@register.com",
      password: "Coach1234",
      role: "COACH",
    });
    coachToken = coach.token;
  });

  it("SUPER_ADMIN can register a new COACH", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "New",
        lastName: "Coach",
        email: "newcoach@register.com",
        password: "Coach1234",
        role: "COACH",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("COACH");
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("SUPER_ADMIN can register a TEAM_ADMIN", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "New",
        lastName: "TeamAdmin",
        email: "newteamadmin@register.com",
        password: "TeamAdmin1234",
        role: "TEAM_ADMIN",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe("TEAM_ADMIN");
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).post("/api/auth/register").send({
      firstName: "Ghost",
      lastName: "User",
      email: "ghost@register.com",
      password: "Ghost1234",
    });

    expect(res.status).toBe(401);
  });

  it("COACH cannot register users (403)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({
        firstName: "Anyone",
        lastName: "User",
        email: "anyone@register.com",
        password: "Anyone1234",
        role: "COACH",
      });

    expect(res.status).toBe(403);
  });

  it("returns 409 when the email is already registered", async () => {
    await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Dup",
        lastName: "User",
        email: "dup@register.com",
        password: "Dup12345",
        role: "COACH",
      });

    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Dup",
        lastName: "Again",
        email: "dup@register.com",
        password: "Dup12345",
        role: "COACH",
      });

    expect(res.status).toBe(409);
  });

  it("returns 400 when the password is shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Short",
        lastName: "Pass",
        email: "shortpass@register.com",
        password: "abc",
        role: "COACH",
      });

    expect(res.status).toBe(400);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "incomplete@register.com" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid role value", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        firstName: "Bad",
        lastName: "Role",
        email: "badrole@register.com",
        password: "BadRole1234",
        role: "INVALID_ROLE",
      });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/logout", () => {
  let token: string;

  beforeAll(async () => {
    await clearTables();
    const admin = await bootstrapAdmin("logout@test.com", "Admin1234");
    token = admin.token;
  });

  it("returns 200 when an authenticated user logs out", async () => {
    const res = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Logout is idempotent and no longer requires a live access token: that token now
  // expires long before the session, and refusing an idle user's logout would leave
  // their refresh token un-revoked. CSRF is what keeps this from being cross-site
  // triggerable — covered in the refresh suite.
  it("returns 200 when no credentials are provided at all", async () => {
    const res = await request(app).post("/api/auth/logout");

    expect(res.status).toBe(200);
  });

  // Bearer clients carry no cookies, so they can never satisfy double-submit —
  // CSRF must stay skipped for them or logout becomes unreachable.
  it("allows a Bearer client with no cookies to log out", async () => {
    const res = await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────
describe("POST /api/auth/refresh", () => {
  const REFRESH_COOKIE = "refresh_token";
  const CSRF_COOKIE = "csrf_token";
  const CSRF_HEADER = "x-csrf-token";

  /** Pulls one cookie's value out of a supertest response's set-cookie header. */
  const readCookie = (res: request.Response, name: string): string | undefined => {
    const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
    const match = raw?.find((cookie) => cookie.startsWith(`${name}=`));
    return match?.split(";")[0].split("=")[1];
  };

  type Session = { refresh: string; csrf: string; accessToken: string };

  const login = async (): Promise<Session> => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "refresh@test.com", password: "Admin1234" });

    expect(res.status).toBe(200);
    const refresh = readCookie(res, REFRESH_COOKIE);
    const csrf = readCookie(res, CSRF_COOKIE);
    expect(refresh).toBeDefined();
    expect(csrf).toBeDefined();

    return { refresh: refresh as string, csrf: csrf as string, accessToken: res.body.data.token };
  };

  /**
   * Refresh carries a cookie-borne credential, so it is CSRF-protected like any
   * other write. Pass `csrf: null` to exercise the cross-site case.
   */
  const postRefresh = (refresh: string | null, csrf: string | null) => {
    const cookies = [
      ...(refresh ? [`${REFRESH_COOKIE}=${refresh}`] : []),
      ...(csrf ? [`${CSRF_COOKIE}=${csrf}`] : []),
    ];

    const req = request(app).post("/api/auth/refresh");
    if (cookies.length > 0) req.set("Cookie", cookies);
    if (csrf) req.set(CSRF_HEADER, csrf);
    return req;
  };

  beforeEach(async () => {
    await clearTables();
    await bootstrapAdmin("refresh@test.com", "Admin1234");
  });

  it("issues a refresh cookie on login", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "refresh@test.com", password: "Admin1234" });

    const raw = res.headers["set-cookie"] as unknown as string[];
    const refreshCookie = raw.find((cookie) => cookie.startsWith(`${REFRESH_COOKIE}=`));

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
    // Scoped so the long-lived credential is not sent on ordinary API calls
    expect(refreshCookie).toContain("Path=/api/auth");
  });

  it("exchanges a valid refresh cookie for a new access token and rotates the refresh token", async () => {
    const session = await login();

    const res = await postRefresh(session.refresh, session.csrf);

    expect(res.status).toBe(200);
    expect(typeof res.body.data.token).toBe("string");
    expect(res.body.data.user.email).toBe("refresh@test.com");
    // The rotated refresh token must never travel in the response body
    expect(res.body.data.refreshToken).toBeUndefined();

    const rotated = readCookie(res, REFRESH_COOKIE);
    expect(rotated).toBeDefined();
    expect(rotated).not.toBe(session.refresh);
  });

  it("returns a working access token that authenticates a protected route", async () => {
    const session = await login();

    const refreshRes = await postRefresh(session.refresh, session.csrf);

    const meRes = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${refreshRes.body.data.token}`);

    expect(meRes.status).toBe(200);
  });

  it("keeps the CSRF token stable across refreshes so other tabs stay valid", async () => {
    const session = await login();

    const first = await postRefresh(session.refresh, session.csrf);
    expect(first.status).toBe(200);
    expect(readCookie(first, CSRF_COOKIE)).toBe(session.csrf);
    expect(first.body.data.csrfToken).toBe(session.csrf);

    const second = await postRefresh(readCookie(first, REFRESH_COOKIE) as string, session.csrf);
    expect(second.status).toBe(200);
    expect(readCookie(second, CSRF_COOKIE)).toBe(session.csrf);

    // A fresh login is still allowed to rotate it
    const relogin = await login();
    expect(relogin.csrf).not.toBe(session.csrf);
  });

  it("does not echo back a malformed CSRF cookie", async () => {
    const session = await login();
    const malformed = "not-a-uuid; DROP TABLE";

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`${REFRESH_COOKIE}=${session.refresh}`, `${CSRF_COOKIE}=${malformed}`])
      .set(CSRF_HEADER, malformed);

    // Rejected outright rather than serialized back into a Set-Cookie header
    expect(res.status).toBe(403);
  });

  it("returns 401 when no refresh cookie is present", async () => {
    const res = await request(app).post("/api/auth/refresh");

    expect(res.status).toBe(401);
  });

  it("returns 401 for an unknown refresh token", async () => {
    const session = await login();
    const res = await postRefresh("not-a-real-token", session.csrf);

    expect(res.status).toBe(401);
  });

  it("rejects a refresh with no CSRF token and leaves the session usable", async () => {
    const session = await login();

    // A cross-site page can send the cookie but cannot read it to build the header
    const res = await postRefresh(session.refresh, null);
    expect(res.status).toBe(403);

    // The rejected attempt must not have consumed the rotation
    const legitimate = await postRefresh(session.refresh, session.csrf);
    expect(legitimate.status).toBe(200);
  });

  it("rejects a refresh whose CSRF header does not match the cookie", async () => {
    const session = await login();

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", [`${REFRESH_COOKIE}=${session.refresh}`, `${CSRF_COOKIE}=${session.csrf}`])
      .set(CSRF_HEADER, "11111111-2222-3333-4444-555555555555");

    expect(res.status).toBe(403);
  });

  it.each(["/api/auth/REFRESH", "/api/auth/refresh/"])(
    "cannot bypass CSRF via path casing or trailing slash (%s)",
    async (path) => {
      const session = await login();

      const res = await request(app)
        .post(path)
        .set("Cookie", [`${REFRESH_COOKIE}=${session.refresh}`]);

      expect(res.status).toBe(403);
    },
  );

  it("revokes every session when a rotated-away token is replayed", async () => {
    const session = await login();

    // Rotate once so the original is superseded...
    const firstRotation = await postRefresh(session.refresh, session.csrf);
    expect(firstRotation.status).toBe(200);
    const rotated = readCookie(firstRotation, REFRESH_COOKIE) as string;

    // ...then replay the superseded token outside the grace window.
    await prisma.refreshToken.updateMany({
      where: { revokedAt: { not: null } },
      data: { revokedAt: new Date(Date.now() - 60 * 60 * 1000) },
    });

    const replay = await postRefresh(session.refresh, session.csrf);
    expect(replay.status).toBe(401);

    // The legitimate token is revoked too — theft response is family-wide.
    const afterTheft = await postRefresh(rotated, session.csrf);
    expect(afterTheft.status).toBe(401);
  });

  it("tolerates a concurrent second refresh inside the grace window", async () => {
    const session = await login();

    const first = await postRefresh(session.refresh, session.csrf);
    expect(first.status).toBe(200);

    // Same cookie again immediately — a second browser tab losing the race, not theft.
    const second = await postRefresh(session.refresh, session.csrf);

    expect(second.status).toBe(200);
  });

  it("stops refreshing once the user is deactivated", async () => {
    const session = await login();

    await prisma.user.updateMany({
      where: { email: "refresh@test.com" },
      data: { isActive: false },
    });

    const res = await postRefresh(session.refresh, session.csrf);

    expect(res.status).toBe(401);
  });

  it("invalidates the refresh token on logout", async () => {
    const session = await login();

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .set("Cookie", [`${REFRESH_COOKIE}=${session.refresh}`, `${CSRF_COOKIE}=${session.csrf}`])
      .set(CSRF_HEADER, session.csrf);
    expect(logoutRes.status).toBe(200);

    const res = await postRefresh(session.refresh, session.csrf);

    expect(res.status).toBe(401);
  });

  it("lets an idle user log out after the access token has expired", async () => {
    const session = await login();

    // No Authorization header and no auth cookie — the access token is long gone
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [`${REFRESH_COOKIE}=${session.refresh}`, `${CSRF_COOKIE}=${session.csrf}`])
      .set(CSRF_HEADER, session.csrf);

    expect(logoutRes.status).toBe(200);

    // The session must actually be revoked, not merely appear to be
    const res = await postRefresh(session.refresh, session.csrf);
    expect(res.status).toBe(401);
  });

  it("rejects a cross-site logout and leaves the session intact", async () => {
    const session = await login();

    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", [`${REFRESH_COOKIE}=${session.refresh}`]);

    expect(logoutRes.status).toBe(403);

    // Still usable — a stranger's page cannot end the session
    const res = await postRefresh(session.refresh, session.csrf);
    expect(res.status).toBe(200);
  });

  it("clears the dead refresh cookie when a refresh is rejected", async () => {
    const session = await login();

    await prisma.refreshToken.updateMany({
      where: { revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await postRefresh(session.refresh, session.csrf);
    expect(res.status).toBe(401);

    const cleared = (res.headers["set-cookie"] as unknown as string[] | undefined)?.find((c) =>
      c.startsWith(`${REFRESH_COOKIE}=`),
    );

    // Without this the browser re-sends a useless cookie for its full 30-day life.
    expect(cleared).toBeDefined();
    expect(cleared).toContain(`${REFRESH_COOKIE}=;`);
    // The clearing cookie must carry the same path it was set with, or it is ignored
    expect(cleared).toContain("Path=/api/auth");

    // The CSRF cookie is deliberately left alone — clearing it would strand the
    // frontend's stored copy and make every later write fail with no recovery.
    const csrfCleared = (res.headers["set-cookie"] as unknown as string[] | undefined)?.find((c) =>
      c.startsWith(`${CSRF_COOKIE}=`),
    );
    expect(csrfCleared).toBeUndefined();
  });

  it("rejects a refresh token whose expiry has passed", async () => {
    const session = await login();

    await prisma.refreshToken.updateMany({
      where: { revokedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await postRefresh(session.refresh, session.csrf);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// Error handling — method not allowed & path not found
// ─────────────────────────────────────────────────────────────
describe("Error handling", () => {
  it("returns 405 for an unsupported HTTP method on a known route", async () => {
    const res = await request(app).get("/api/auth/login");

    expect(res.status).toBe(405);
    expect(res.body.success).toBe(false);
  });

  it("returns 404 for an unknown API path", async () => {
    const res = await request(app).get("/api/totally-nonexistent-path");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// SSO error paths
// ─────────────────────────────────────────────────────────────

describe("SSO error paths", () => {
  let superAdminToken: string;

  beforeAll(async () => {
    await clearTables();
    const admin = await bootstrapAdmin("super@sso-errors.com", "Admin1234");
    superAdminToken = admin.token;
  });

  // ── GET /api/auth/sso/login ──────────────────────────────
  describe("GET /api/auth/sso/login", () => {
    it("returns 500 when OIDC_ISSUER_URL is not configured in the test environment", async () => {
      // In the test env OIDC_ISSUER_URL is unset, so getOidcClient() throws a plain Error
      // which propagates through next(error) to the Express error handler → 500.
      const res = await request(app).get("/api/auth/sso/login").redirects(0);
      expect(res.status).toBe(500);
    });
  });

  // ── GET /api/auth/sso/callback ───────────────────────────
  describe("GET /api/auth/sso/callback — state validation", () => {
    it("redirects to error when state query param is missing", async () => {
      const res = await request(app).get("/api/auth/sso/callback").redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=invalid_state");
    });

    it("redirects to error when state does not match any DB row", async () => {
      const res = await request(app)
        .get("/api/auth/sso/callback?state=totally-nonexistent-state-xyz")
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=invalid_state");
    });

    it("redirects to error and cleans up an expired OidcState row", async () => {
      const expiredState = `expired-state-${Date.now()}`;
      await prisma.oidcState.create({
        data: {
          state: expiredState,
          nonce: "some-nonce",
          inviteToken: null,
          expiresAt: new Date(Date.now() - 1000), // already expired
        },
      });

      const res = await request(app)
        .get(`/api/auth/sso/callback?state=${expiredState}`)
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=invalid_state");

      // The expired row must have been cleaned up by the controller
      const row = await prisma.oidcState.findUnique({ where: { state: expiredState } });
      expect(row).toBeNull();
    });
  });

  // ── GET /api/auth/sso/accept-invite ─────────────────────
  describe("GET /api/auth/sso/accept-invite — invite validation", () => {
    it("redirects to error when token query param is missing", async () => {
      const res = await request(app).get("/api/auth/sso/accept-invite").redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=missing_invite_token");
    });

    it("redirects to error when invite token does not exist", async () => {
      const res = await request(app)
        .get("/api/auth/sso/accept-invite?token=nonexistent-token-000")
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=invite_not_found");
    });

    it("redirects to error when invite has requiresSso: false (password invite)", async () => {
      // Create a normal (non-SSO) invite
      const inviteRes = await request(app)
        .post("/api/invites")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ email: "non-sso-invite@sso-errors.com", role: "COACH" });

      const token = inviteRes.body.data.token as string;

      const res = await request(app).get(`/api/auth/sso/accept-invite?token=${token}`).redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=invite_not_sso");
    });

    it("redirects to error when invite has already been accepted", async () => {
      // Create and accept a password invite
      const inviteRes = await request(app)
        .post("/api/invites")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ email: "accepted-sso@sso-errors.com", role: "COACH" });

      const token = inviteRes.body.data.token as string;

      await request(app).post("/api/invites/accept-invite").send({
        token,
        firstName: "Already",
        lastName: "Accepted",
        password: "Accepted1234",
      });

      const res = await request(app).get(`/api/auth/sso/accept-invite?token=${token}`).redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=invite_already_accepted");
    });

    it("redirects to error when invite is expired", async () => {
      // Insert an expired SSO invite directly into the DB
      const expiredToken = `expired-sso-invite-${Date.now()}`;
      await prisma.userInvite.create({
        data: {
          token: expiredToken,
          email: "expired-sso@sso-errors.com",
          role: "COACH",
          requiresSso: true,
          expiresAt: new Date(Date.now() - 1000), // already expired
          createdBy: (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } }))!.id,
        },
      });

      const res = await request(app)
        .get(`/api/auth/sso/accept-invite?token=${expiredToken}`)
        .redirects(0);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("reason=invite_expired");
    });
  });

  // ── POST /api/auth/login — SSO-only account ──────────────
  describe("POST /api/auth/login — SSO-only account", () => {
    it("returns 400 with an SSO-specific message when the account has no password", async () => {
      // Create an SSO-only user directly in DB (password: null)
      await prisma.user.create({
        data: {
          email: "sso-only@sso-errors.com",
          password: null,
          firstName: "SSO",
          lastName: "Only",
          role: "COACH",
          timezone: "UTC",
          publicBookingSlug: "sso-only-user-slug",
          ssoProvider: "okta",
          ssoSub: "sub-sso-only-test-123",
          ssoLinkedAt: new Date(),
        },
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "sso-only@sso-errors.com", password: "anypassword" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/identity provider/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// JWT security
// ─────────────────────────────────────────────────────────────
describe("JWT security", () => {
  it("returns 401 when a JWT signed with a different secret is sent", async () => {
    const fakeToken = jwt.sign({ sub: "fake-user-id" }, "wrong-secret");

    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 when a JWT with alg: none is sent", async () => {
    // Craft a token manually: header with alg:none + any payload, no signature
    const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({ sub: "any-user-id" })).toString("base64url");
    const noneToken = `${header}.${payload}.`;

    const res = await request(app).get("/api/users/me").set("Authorization", `Bearer ${noneToken}`);

    expect(res.status).toBe(401);
  });
});

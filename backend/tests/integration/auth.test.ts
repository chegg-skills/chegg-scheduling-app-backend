import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
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

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).post("/api/auth/logout");

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

      const res = await request(app)
        .get(`/api/auth/sso/accept-invite?token=${token}`)
        .redirects(0);

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

      const res = await request(app)
        .get(`/api/auth/sso/accept-invite?token=${token}`)
        .redirects(0);

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

import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

let superAdminToken: string;
let teamAdminToken: string;
let coachToken: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@invites.com", "Admin1234");
  superAdminToken = admin.token;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@invites.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminToken = teamAdmin.token;

  const coach = await registerUser(superAdminToken, {
    firstName: "A",
    lastName: "Coach",
    email: "coach@invites.com",
    password: "Coach1234",
    role: "COACH",
  });
  coachToken = coach.token;
});

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// POST /api/invites
// ─────────────────────────────────────────────────────────────
describe("POST /api/invites", () => {
  it("SUPER_ADMIN can create an invite and receives the token in non-prod", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "newuser1@invites.com", role: "COACH" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe("newuser1@invites.com");
    expect(res.body.data.role).toBe("COACH");
    // token is exposed when NODE_ENV !== "production"
    expect(typeof res.body.data.token).toBe("string");
  });

  it("TEAM_ADMIN can create an invite", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ email: "newuser2@invites.com", role: "COACH" });

    expect(res.status).toBe(201);
  });

  it("COACH cannot create an invite (403)", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ email: "newuser3@invites.com", role: "COACH" });

    expect(res.status).toBe(403);
  });

  it("returns 409 when an active invite already exists for the email", async () => {
    const email = "dup-invite@invites.com";

    await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email, role: "COACH" });

    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email, role: "COACH" });

    expect(res.status).toBe(409);
  });

  it("returns 409 when the email belongs to an existing user", async () => {
    // "coach@invites.com" was registered in beforeAll
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "coach@invites.com", role: "COACH" });

    expect(res.status).toBe(409);
  });

  it("returns 400 when the email field is missing", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ role: "COACH" });

    expect(res.status).toBe(400);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post("/api/invites")
      .send({ email: "anon@invites.com", role: "COACH" });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/invites/accept-invite
// ─────────────────────────────────────────────────────────────
describe("POST /api/invites/accept-invite", () => {
  let activeInviteToken: string;

  beforeAll(async () => {
    // Create a fresh invite whose token we can use in the tests below
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "accepttest@invites.com", role: "COACH" });

    activeInviteToken = res.body.data.token as string;
  });

  it("accepts a valid invite and creates a new user account", async () => {
    const res = await request(app).post("/api/invites/accept-invite").send({
      token: activeInviteToken,
      firstName: "Accepted",
      lastName: "User",
      password: "AcceptUser1234",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe("accepttest@invites.com");
    expect(res.body.data.user.role).toBe("COACH");
    expect(typeof res.body.data.token).toBe("string");
    // password must never appear in the response
    expect(res.body.data.user.password).toBeUndefined();
  });

  it("returns 409 when the invite token has already been accepted", async () => {
    const res = await request(app).post("/api/invites/accept-invite").send({
      token: activeInviteToken,
      firstName: "Repeat",
      lastName: "User",
      password: "RepeatUser1234",
    });

    expect(res.status).toBe(409);
  });

  it("returns 404 for a token that does not exist", async () => {
    const res = await request(app).post("/api/invites/accept-invite").send({
      token: "completely-invalid-nonexistent-token-xyz",
      firstName: "Ghost",
      lastName: "User",
      password: "Ghost1234",
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app).post("/api/invites/accept-invite").send({
      token: "sometoken",
      // missing firstName, lastName, password
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 when password is shorter than 8 characters", async () => {
    // Create a second valid invite to use for this edge case
    const inviteRes = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "shortpwdtest@invites.com", role: "COACH" });

    const res = await request(app).post("/api/invites/accept-invite").send({
      token: inviteRes.body.data.token,
      firstName: "Short",
      lastName: "Pass",
      password: "abc",
    });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// requiresSso flag
// ─────────────────────────────────────────────────────────────

describe("requiresSso — invite creation and acceptance", () => {
  let ssoInviteToken: string;

  beforeAll(async () => {
    // Create a fresh SSO invite for use in tests below
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "sso-invitee@invites.com", role: "COACH", requiresSso: true });

    ssoInviteToken = res.body.data.token as string;
  });

  it("creating an invite with requiresSso: true succeeds (201)", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "sso-invitee2@invites.com", role: "COACH", requiresSso: true });

    expect(res.status).toBe(201);
    expect(typeof res.body.data.token).toBe("string");
  });

  it("POST /invites/accept-invite returns 400 when the invite requires SSO", async () => {
    const res = await request(app).post("/api/invites/accept-invite").send({
      token: ssoInviteToken,
      firstName: "SSO",
      lastName: "User",
      password: "SsoUser1234",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/SSO authentication/i);
  });

  it("GET /invites/validate returns requiresSso: true for an SSO-required invite", async () => {
    const res = await request(app).get(`/api/invites/validate?token=${ssoInviteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.requiresSso).toBe(true);
  });
});

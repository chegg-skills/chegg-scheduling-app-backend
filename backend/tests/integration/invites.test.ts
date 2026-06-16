import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
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

  it("TEAM_ADMIN cannot invite a TEAM_ADMIN (403)", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ email: "teamadmin2@invites.com", role: "TEAM_ADMIN" });

    expect(res.status).toBe(403);
  });

  it("TEAM_ADMIN cannot invite a SUPER_ADMIN (403)", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ email: "superadmin2@invites.com", role: "SUPER_ADMIN" });

    expect(res.status).toBe(403);
  });

  it("SUPER_ADMIN can invite a TEAM_ADMIN", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "newteamadmin@invites.com", role: "TEAM_ADMIN" });

    expect(res.status).toBe(201);
  });

  it("SUPER_ADMIN can invite a SUPER_ADMIN", async () => {
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "newsuperadmin@invites.com", role: "SUPER_ADMIN" });

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
// GET /api/invites
// ─────────────────────────────────────────────────────────────
describe("GET /api/invites", () => {
  it("SUPER_ADMIN can list all invites with pagination", async () => {
    const res = await request(app)
      .get("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.invites)).toBe(true);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
    // Each invite has the expected shape
    for (const invite of res.body.data.invites) {
      expect(invite).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        role: expect.any(String),
        status: expect.stringMatching(/^(PENDING|ACCEPTED|EXPIRED|REVOKED)$/),
        requiresSso: expect.any(Boolean),
        createdByUser: expect.objectContaining({ firstName: expect.any(String) }),
      });
    }
  });

  it("TEAM_ADMIN only sees invites they created", async () => {
    // Create one invite as TEAM_ADMIN and one as SUPER_ADMIN
    await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ email: "ta-scoped@invites.com", role: "COACH" });

    await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "sa-scoped@invites.com", role: "COACH" });

    const res = await request(app)
      .get("/api/invites")
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    // TEAM_ADMIN should not see the SUPER_ADMIN-created invite
    const emails = res.body.data.invites.map((i: { email: string }) => i.email);
    expect(emails).not.toContain("sa-scoped@invites.com");
    expect(emails).toContain("ta-scoped@invites.com");
  });

  it("filters by status=PENDING returns only pending invites", async () => {
    const res = await request(app)
      .get("/api/invites?status=PENDING")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    for (const invite of res.body.data.invites) {
      expect(invite.status).toBe("PENDING");
    }
  });

  it("filters by status=ACCEPTED returns only accepted invites", async () => {
    const res = await request(app)
      .get("/api/invites?status=ACCEPTED")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    for (const invite of res.body.data.invites) {
      expect(invite.status).toBe("ACCEPTED");
    }
  });

  it("filters by role=COACH returns only COACH invites", async () => {
    const res = await request(app)
      .get("/api/invites?role=COACH")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    for (const invite of res.body.data.invites) {
      expect(invite.role).toBe("COACH");
    }
  });

  it("COACH cannot list invites (403)", async () => {
    const res = await request(app)
      .get("/api/invites")
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/api/invites");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/invites/:id
// ─────────────────────────────────────────────────────────────
describe("DELETE /api/invites/:id", () => {
  let pendingInviteId: string;
  let teamAdminInviteId: string;
  let acceptedInviteId: string;

  beforeAll(async () => {
    // Pending invite created by SUPER_ADMIN
    const r1 = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "revoke-pending@invites.com", role: "COACH" });
    pendingInviteId = r1.body.data.id;

    // Pending invite created by TEAM_ADMIN
    const r2 = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ email: "ta-revoke@invites.com", role: "COACH" });
    teamAdminInviteId = r2.body.data.id;

    // Accepted invite (accept it via accept-invite endpoint)
    const r3 = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "revoke-accepted@invites.com", role: "COACH" });
    const acceptedToken = r3.body.data.token as string;
    acceptedInviteId = r3.body.data.id;
    await request(app).post("/api/invites/accept-invite").send({
      token: acceptedToken,
      firstName: "Accepted",
      lastName: "Revoke",
      password: "Accepted1234",
    });
  });

  it("SUPER_ADMIN can revoke a PENDING invite", async () => {
    const res = await request(app)
      .delete(`/api/invites/${pendingInviteId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("REVOKED");
    expect(res.body.data.revokedAt).not.toBeNull();
  });

  it("cannot revoke an already-revoked invite (409)", async () => {
    const res = await request(app)
      .delete(`/api/invites/${pendingInviteId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(409);
  });

  it("cannot revoke an already-accepted invite (409)", async () => {
    const res = await request(app)
      .delete(`/api/invites/${acceptedInviteId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(409);
  });

  it("TEAM_ADMIN can revoke an invite they created", async () => {
    const res = await request(app)
      .delete(`/api/invites/${teamAdminInviteId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("REVOKED");
  });

  it("TEAM_ADMIN cannot revoke an invite created by SUPER_ADMIN (403)", async () => {
    // Create a fresh invite as SUPER_ADMIN to use as the target
    const r = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "ta-forbidden@invites.com", role: "COACH" });

    const res = await request(app)
      .delete(`/api/invites/${r.body.data.id}`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent invite id", async () => {
    const res = await request(app)
      .delete("/api/invites/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
  });

  it("COACH cannot revoke invites (403)", async () => {
    const res = await request(app)
      .delete(`/api/invites/${pendingInviteId}`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(403);
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

  it("POST /invites/validate returns requiresSso: true for an SSO-required invite", async () => {
    const res = await request(app).post("/api/invites/validate").send({ token: ssoInviteToken });

    expect(res.status).toBe(200);
    expect(res.body.data.requiresSso).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/invites/validate — edge cases
// ─────────────────────────────────────────────────────────────
describe("POST /api/invites/validate — edge cases", () => {
  let standardInviteToken: string;
  let acceptedInviteToken: string;

  beforeAll(async () => {
    // Standard (non-SSO) invite
    const res = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "validate-standard@invites.com", role: "COACH" });

    standardInviteToken = res.body.data.token as string;

    // Invite that will be accepted so we can test the "already_accepted" path
    const acceptRes = await request(app)
      .post("/api/invites")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ email: "validate-accepted@invites.com", role: "COACH" });

    acceptedInviteToken = acceptRes.body.data.token as string;

    await request(app).post("/api/invites/accept-invite").send({
      token: acceptedInviteToken,
      firstName: "Already",
      lastName: "Accepted",
      password: "Accepted1234",
    });
  });

  it("returns valid: true with email and role for a standard (non-SSO) invite token", async () => {
    const res = await request(app)
      .post("/api/invites/validate")
      .send({ token: standardInviteToken });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.email).toBe("validate-standard@invites.com");
    expect(res.body.data.role).toBe("COACH");
    expect(res.body.data.requiresSso).toBe(false);
  });

  it("returns valid: false with reason: not_found for an unknown token", async () => {
    const res = await request(app)
      .post("/api/invites/validate")
      .send({ token: "this-token-does-not-exist-xyz" });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.reason).toBe("not_found");
  });

  it("returns valid: false with reason: already_accepted for a used token", async () => {
    const res = await request(app)
      .post("/api/invites/validate")
      .send({ token: acceptedInviteToken });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.reason).toBe("already_accepted");
  });

  it("returns valid: false with reason: expired for an expired token", async () => {
    // Insert an already-expired invite directly into the DB
    const expiredToken = `expired-validate-${Date.now()}`;
    await prisma.userInvite.create({
      data: {
        token: expiredToken,
        email: "validate-expired@invites.com",
        role: "COACH",
        requiresSso: false,
        expiresAt: new Date(Date.now() - 1000),
        createdBy: (await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } }))!.id,
      },
    });

    const res = await request(app).post("/api/invites/validate").send({ token: expiredToken });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(false);
    expect(res.body.data.reason).toBe("expired");
  });

  it("returns 400 when the token field is missing from body", async () => {
    const res = await request(app).post("/api/invites/validate").send({});

    expect(res.status).toBe(400);
  });
});

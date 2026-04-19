import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

let superAdminToken: string;
let superAdminId: string;
let teamAdminToken: string;
let teamAdminId: string;
let coachToken: string;
let coachId: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@users.com", "Admin1234");
  superAdminToken = admin.token;
  superAdminId = admin.id;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@users.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminToken = teamAdmin.token;
  teamAdminId = teamAdmin.id;

  const coach = await registerUser(superAdminToken, {
    firstName: "A",
    lastName: "Coach",
    email: "coach@users.com",
    password: "Coach1234",
    role: "COACH",
  });
  coachToken = coach.token;
  coachId = coach.id;
});

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────────
describe("GET /api/users", () => {
  it("SUPER_ADMIN can list users with pagination metadata", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 50,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
    // Passwords must never appear in any user object
    for (const user of res.body.data.users as Record<string, unknown>[]) {
      expect(user.password).toBeUndefined();
    }
  });

  it("TEAM_ADMIN can list users", async () => {
    const res = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
  });

  it("COACH cannot list users (403)", async () => {
    const res = await request(app).get("/api/users").set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).get("/api/users");

    expect(res.status).toBe(401);
  });

  it("respects the page and pageSize query parameters", async () => {
    const res = await request(app)
      .get("/api/users?page=1&pageSize=2")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users.length).toBeLessThanOrEqual(2);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.pageSize).toBe(2);
  });

  it("supports partial search by name", async () => {
    const res = await request(app)
      .get("/api/users?search=team")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(
      res.body.data.users.some((user: { email: string }) => user.email === "teamadmin@users.com"),
    ).toBe(true);
  });

  it("supports partial search by email", async () => {
    const res = await request(app)
      .get("/api/users?search=coach@users")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(1);
    expect(res.body.data.users[0].email).toBe("coach@users.com");
  });

  it("falls back to defaults for invalid pagination params", async () => {
    const res = await request(app)
      .get("/api/users?page=abc&pageSize=-5")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    // parsePositiveInt returns undefined for invalid values → service defaults apply
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.pageSize).toBe(50);
  });

  it("returns 405 for DELETE on the /api/users collection", async () => {
    const res = await request(app)
      .delete("/api/users")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(405);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/users/:userId
// ─────────────────────────────────────────────────────────────
describe("GET /api/users/:userId", () => {
  it("SUPER_ADMIN can read a specific user", async () => {
    const res = await request(app)
      .get(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(coachId);
    expect(res.body.data.email).toBe("coach@users.com");
    expect(res.body.data.password).toBeUndefined();

    // Verify detailed fields are present (even if empty)
    expect(res.body.data.teamMemberships).toBeDefined();
    expect(res.body.data.coachedEvents).toBeDefined();
    expect(res.body.data.weeklyAvailability).toBeDefined();
    expect(res.body.data.availabilityExceptions).toBeDefined();
    expect(Array.isArray(res.body.data.teamMemberships)).toBe(true);
    expect(Array.isArray(res.body.data.coachedEvents)).toBe(true);
  });

  it("TEAM_ADMIN can read a user", async () => {
    const res = await request(app)
      .get(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(coachId);
  });

  it("COACH cannot read user details (403)", async () => {
    const res = await request(app)
      .get(`/api/users/${superAdminId}`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent userId", async () => {
    const res = await request(app)
      .get("/api/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).get(`/api/users/${coachId}`);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/users/me
// ─────────────────────────────────────────────────────────────
describe("GET /api/users/me", () => {
  it("SUPER_ADMIN can read own profile", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(superAdminId);
    expect(res.body.data.password).toBeUndefined();
  });

  it("TEAM_ADMIN can read own profile", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(teamAdminId);
    expect(res.body.data.password).toBeUndefined();
  });

  it("COACH can read own profile", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(coachId);
    expect(res.body.data.password).toBeUndefined();
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).get("/api/users/me");

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/users/me
// ─────────────────────────────────────────────────────────────
describe("PATCH /api/users/me", () => {
  it("COACH can update their own timezone", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ timezone: "Europe/London" });

    expect(res.status).toBe(200);
    expect(res.body.data.timezone).toBe("Europe/London");
  });

  it("COACH cannot update their own email via /me (field ignored)", async () => {
    // Current user's email is coach@users.com
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ email: "new@email.com", timezone: "UTC" });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("coach@users.com"); // Remains unchanged
    expect(res.body.data.timezone).toBe("UTC");
  });

  it("COACH cannot update their own role via /me (field ignored)", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ role: "SUPER_ADMIN" });

    // The field is ignored, but since no other fields were provided,
    // it will return 400 "At least one field is required to update profile."
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("required");
  });

  it("COACH cannot change their own isActive status via /me (field ignored)", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/users/:userId
// ─────────────────────────────────────────────────────────────
describe("PATCH /api/users/:userId", () => {
  it("SUPER_ADMIN can update a user's timezone", async () => {
    const res = await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ timezone: "America/New_York" });

    expect(res.status).toBe(200);
    expect(res.body.data.timezone).toBe("America/New_York");
  });

  it("SUPER_ADMIN can update a user's preferredLanguage", async () => {
    const res = await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ preferredLanguage: "es" });

    expect(res.status).toBe(200);
    expect(res.body.data.preferredLanguage).toBe("es");
  });

  it("SUPER_ADMIN can save a Zoom ISV link on the user profile", async () => {
    const zoomIsvLink =
      "https://students.skills.chegg.com/meeting/join/7d26db62-1f37-49f5-8b49-97a66444007b";

    const res = await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ zoomIsvLink });

    expect(res.status).toBe(200);
    expect(res.body.data.zoomIsvLink).toBe(zoomIsvLink);
  });

  it("SUPER_ADMIN can change a user's role", async () => {
    const res = await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ role: "TEAM_ADMIN" });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe("TEAM_ADMIN");

    // Reset back to COACH so subsequent tests are unaffected
    await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ role: "COACH" });
  });

  it("TEAM_ADMIN cannot change a user's role (403)", async () => {
    const res = await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ role: "SUPER_ADMIN" });

    expect(res.status).toBe(403);
  });

  it("TEAM_ADMIN cannot change a user's isActive status (403)", async () => {
    const res = await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(403);
  });

  it("TEAM_ADMIN cannot update a SUPER_ADMIN account (403)", async () => {
    const res = await request(app)
      .patch(`/api/users/${superAdminId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ timezone: "America/Chicago" });

    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid timezone string", async () => {
    const res = await request(app)
      .patch(`/api/users/${coachId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ timezone: "Not/A_Valid_Timezone_XYZ" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent user ID", async () => {
    const res = await request(app)
      .patch("/api/users/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ timezone: "UTC" });

    expect(res.status).toBe(404);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).patch(`/api/users/${coachId}`).send({ timezone: "UTC" });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/users/:userId
// ─────────────────────────────────────────────────────────────
describe("DELETE /api/users/:userId", () => {
  it("SUPER_ADMIN can soft-delete (deactivate) a user", async () => {
    const throwaway = await registerUser(superAdminToken, {
      firstName: "Delete",
      lastName: "Me",
      email: "deleteme@users.com",
      password: "Delete1234",
      role: "COACH",
    });

    const res = await request(app)
      .delete(`/api/users/${throwaway.id}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("TEAM_ADMIN can soft-delete (deactivate) a COACH user", async () => {
    const throwawayCoach = await registerUser(superAdminToken, {
      firstName: "Delete",
      lastName: "Coach",
      email: "deletecoach@users.com",
      password: "DeleteCoach1234",
      role: "COACH",
    });

    const res = await request(app)
      .delete(`/api/users/${throwawayCoach.id}`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);
  });

  it("TEAM_ADMIN cannot delete a TEAM_ADMIN user (403)", async () => {
    const res = await request(app)
      .delete(`/api/users/${teamAdminId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 403 when trying to deactivate the last active SUPER_ADMIN", async () => {
    // superAdminId is the only SUPER_ADMIN → deletion must be blocked
    const res = await request(app)
      .delete(`/api/users/${superAdminId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).delete(`/api/users/${coachId}`);

    expect(res.status).toBe(401);
  });
});

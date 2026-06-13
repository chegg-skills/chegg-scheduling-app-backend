import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { prisma } from "../../src/shared/db/prisma";

let superAdminToken: string;
let teamAdminToken: string;
let teamAdminId: string;
let teamAdminToken2: string;
let teamAdminId2: string;
let coachToken: string;
let coachId: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@teams.com", "Admin1234");
  superAdminToken = admin.token;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@teams.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminToken = teamAdmin.token;
  teamAdminId = teamAdmin.id;

  const teamAdmin2 = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin2",
    email: "teamadmin2@teams.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminToken2 = teamAdmin2.token;
  teamAdminId2 = teamAdmin2.id;

  const coach = await registerUser(superAdminToken, {
    firstName: "A",
    lastName: "Coach",
    email: "coach@teams.com",
    password: "Coach1234",
    role: "COACH",
  });
  coachToken = coach.token;
  coachId = coach.id;
});

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// POST /api/teams
// ─────────────────────────────────────────────────────────────
describe("POST /api/teams", () => {
  it("SUPER_ADMIN can create a team and receives the created team in response", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Alpha Team", description: "First team", teamLeadId: teamAdminId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("alpha team");
    expect(res.body.data.description).toBe("First team");
    expect(res.body.data.teamLeadId).toBe(teamAdminId);
    expect(typeof res.body.data.id).toBe("string");
  });

  it("normalises team name to lowercase", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "  Beta TEAM  ", teamLeadId: teamAdminId });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("beta team");
  });

  it("TEAM_ADMIN cannot create a team (403)", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ name: "Blocked Team", teamLeadId: teamAdminId });

    expect(res.status).toBe(403);
  });

  it("COACH cannot create a team (403)", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ name: "Blocked Team", teamLeadId: teamAdminId });

    expect(res.status).toBe(403);
  });

  it("returns 409 when a team with that name already exists", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Alpha Team", teamLeadId: teamAdminId });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ teamLeadId: teamAdminId });

    expect(res.status).toBe(400);
  });

  it("returns 400 when teamLeadId is missing", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "No Lead Team" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when teamLeadId does not belong to a TEAM_ADMIN", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Bad Lead Team", teamLeadId: coachId });

    expect(res.status).toBe(400);
  });

  it("returns 400 when teamLeadId does not exist", async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Ghost Lead Team", teamLeadId: "00000000-0000-0000-0000-000000000000" });

    expect(res.status).toBe(400);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post("/api/teams")
      .send({ name: "Anon Team", teamLeadId: teamAdminId });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/teams
// ─────────────────────────────────────────────────────────────
describe("GET /api/teams", () => {
  it("SUPER_ADMIN can list teams with pagination metadata", async () => {
    const res = await request(app)
      .get("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.teams)).toBe(true);
    expect(res.body.data.teams.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 50,
      total: expect.any(Number),
      totalPages: expect.any(Number),
    });
  });

  it("TEAM_ADMIN can list teams", async () => {
    const res = await request(app)
      .get("/api/teams")
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.teams)).toBe(true);
  });

  it("COACH can list teams (returns 200 with empty list if not enrolled in any)", async () => {
    const res = await request(app).get("/api/teams").set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.teams).toEqual([]);
  });

  it("COACH can list teams they are a member of", async () => {
    // Create a team first
    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Coach Team List Test", teamLeadId: teamAdminId });
    const enrolledTeamId = teamRes.body.data.id;

    // Enroll the coach in the team
    await prisma.teamMember.create({
      data: {
        teamId: enrolledTeamId,
        userId: coachId,
        isActive: true,
      },
    });

    const res = await request(app).get("/api/teams").set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.teams.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.teams.some((t: any) => t.id === enrolledTeamId)).toBe(true);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).get("/api/teams");

    expect(res.status).toBe(401);
  });

  it("respects page and pageSize query parameters", async () => {
    const res = await request(app)
      .get("/api/teams?page=1&pageSize=1")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.teams.length).toBeLessThanOrEqual(1);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.pageSize).toBe(1);
  });

  it("falls back to defaults for invalid pagination params", async () => {
    const res = await request(app)
      .get("/api/teams?page=abc&pageSize=-5")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(1);
    expect(res.body.data.pagination.pageSize).toBe(50);
  });

  it("returns 405 for DELETE on the /api/teams collection", async () => {
    const res = await request(app)
      .delete("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(405);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/teams/:teamId
// ─────────────────────────────────────────────────────────────
describe("GET /api/teams/:teamId", () => {
  let teamId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Read Test Team", teamLeadId: teamAdminId });

    teamId = res.body.data.id as string;
  });

  it("SUPER_ADMIN can read a specific team", async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(teamId);
    expect(res.body.data.name).toBe("read test team");
  });

  it("TEAM_ADMIN can read a team", async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(teamId);
  });

  it("COACH can read a specific team they are a member of", async () => {
    // Create a team
    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Coach Read Test Team", teamLeadId: teamAdminId });
    const enrolledTeamId = teamRes.body.data.id;

    // Enroll the coach
    await prisma.teamMember.create({
      data: {
        teamId: enrolledTeamId,
        userId: coachId,
        isActive: true,
      },
    });

    const res = await request(app)
      .get(`/api/teams/${enrolledTeamId}`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(enrolledTeamId);
  });

  it("COACH cannot read a team they are not a member of (403)", async () => {
    const res = await request(app)
      .get(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent teamId", async () => {
    const res = await request(app)
      .get("/api/teams/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).get(`/api/teams/${teamId}`);

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/teams/:teamId
// ─────────────────────────────────────────────────────────────
describe("PATCH /api/teams/:teamId", () => {
  let teamId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Patch Test Team", description: "Original desc", teamLeadId: teamAdminId });

    teamId = res.body.data.id as string;
  });

  it("SUPER_ADMIN can update the team name", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Updated Team Name" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("updated team name");

    // restore name for subsequent tests
    await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Patch Test Team" });
  });

  it("SUPER_ADMIN can update the team description", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("New description");
  });

  it("SUPER_ADMIN can change the teamLead to another TEAM_ADMIN", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ teamLeadId: teamAdminId2 });

    expect(res.status).toBe(200);
    expect(res.body.data.teamLeadId).toBe(teamAdminId2);
  });

  it("SUPER_ADMIN can toggle isActive", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.data.isActive).toBe(false);

    // restore
    await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ isActive: true });
  });

  it("TEAM_ADMIN cannot update a team (403)", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`)
      .send({ name: "Sneaky Rename" });

    expect(res.status).toBe(403);
  });

  it("COACH cannot update a team (403)", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${coachToken}`)
      .send({ name: "Sneaky Rename" });

    expect(res.status).toBe(403);
  });

  it("returns 400 when name is blank", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "   " });

    expect(res.status).toBe(400);
  });

  it("returns 400 when new teamLeadId does not belong to a TEAM_ADMIN", async () => {
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ teamLeadId: coachId });

    expect(res.status).toBe(400);
  });

  it("returns 409 when name conflicts with an existing team", async () => {
    // "alpha team" was created in POST describe block
    const res = await request(app)
      .patch(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Alpha Team" });

    expect(res.status).toBe(409);
  });

  it("returns 404 for a non-existent teamId", async () => {
    const res = await request(app)
      .patch("/api/teams/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app).patch(`/api/teams/${teamId}`).send({ name: "Anon Update" });

    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/teams/:teamId
// ─────────────────────────────────────────────────────────────
describe("DELETE /api/teams/:teamId", () => {
  it("SUPER_ADMIN can delete a team", async () => {
    const createRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Delete Me Team", teamLeadId: teamAdminId });

    const teamId = createRes.body.data.id as string;

    const res = await request(app)
      .delete(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(teamId);

    // confirm it's gone
    const getRes = await request(app)
      .get(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(getRes.status).toBe(404);
  });

  it("TEAM_ADMIN cannot delete a team (403)", async () => {
    const createRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Protected Team", teamLeadId: teamAdminId });

    const teamId = createRes.body.data.id as string;

    const res = await request(app)
      .delete(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(403);
  });

  it("COACH cannot delete a team (403)", async () => {
    const createRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Coach Protected Team", teamLeadId: teamAdminId });

    const teamId = createRes.body.data.id as string;

    const res = await request(app)
      .delete(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent teamId", async () => {
    const res = await request(app)
      .delete("/api/teams/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 401 when no auth token is provided", async () => {
    const createRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Anon Delete Team", teamLeadId: teamAdminId });

    const teamId = createRes.body.data.id as string;

    const res = await request(app).delete(`/api/teams/${teamId}`);

    expect(res.status).toBe(401);
  });

  it("deletes a team with bookings and preserves booking history", async () => {
    // Create a team
    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Booking Protected Team", teamLeadId: teamAdminId });
    const teamId = teamRes.body.data.id;

    // Create an event and booking directly via Prisma
    const offering = await prisma.eventType.create({
      data: {
        key: "protected-offering-team",
        name: "Protected Offering",
        createdById: teamAdminId,
        updatedById: teamAdminId,
      },
    });

    const event = await prisma.event.create({
      data: {
        name: "Protected Event",
        teamId,
        eventTypeId: offering.id,
        interactionType: "ONE_TO_ONE",
        durationSeconds: 1800,
        locationType: "VIRTUAL",
        locationValue: "https://meet.example.com",
        createdById: teamAdminId,
        updatedById: teamAdminId,
        publicBookingSlug: "protected-event-slug-team",
      },
    });

    const booking = await prisma.booking.create({
      data: {
        studentName: "Test Student",
        studentEmail: "student@example.com",
        teamId,
        eventId: event.id,
        coachUserId: teamAdminId,
        startTime: new Date(),
        endTime: new Date(Date.now() + 1800000),
      },
    });

    // Delete the team — should succeed even with bookings
    const res = await request(app)
      .delete(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);

    // Team is no longer visible
    const getRes = await request(app)
      .get(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`);
    expect(getRes.status).toBe(404);

    // Booking record is preserved with teamId and eventId intact
    const preserved = await prisma.booking.findUnique({ where: { id: booking.id } });
    expect(preserved).not.toBeNull();
    expect(preserved!.teamId).toBe(teamId);
    expect(preserved!.eventId).toBe(event.id);
  });

  it("returns 405 for POST on a specific team resource", async () => {
    const createRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "Method Check Team", teamLeadId: teamAdminId });

    const teamId = createRes.body.data.id as string;

    const res = await request(app)
      .post(`/api/teams/${teamId}`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({});

    expect(res.status).toBe(405);
  });

  describe("GET /api/teams/:teamId/notification-config", () => {
    let teamId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post("/api/teams")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Notif Config Team " + Math.random().toString(36).substring(7),
          teamLeadId: teamAdminId,
        });
      teamId = createRes.body.data.id as string;
    });

    it("allows SUPER_ADMIN to get notification config", async () => {
      const res = await request(app)
        .get(`/api/teams/${teamId}/notification-config`)
        .set("Authorization", `Bearer ${superAdminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("reminderOffsets");
    });

    it("allows TEAM_ADMIN (lead) to get notification config", async () => {
      const res = await request(app)
        .get(`/api/teams/${teamId}/notification-config`)
        .set("Authorization", `Bearer ${teamAdminToken}`);
      expect(res.status).toBe(200);
    });

    it("allows COACH enrolled in team to get notification config", async () => {
      // enroll coach
      await prisma.teamMember.create({
        data: {
          teamId,
          userId: coachId,
          isActive: true,
        },
      });

      const res = await request(app)
        .get(`/api/teams/${teamId}/notification-config`)
        .set("Authorization", `Bearer ${coachToken}`);
      expect(res.status).toBe(200);
    });

    it("prevents COACH NOT enrolled in team from getting notification config", async () => {
      const res = await request(app)
        .get(`/api/teams/${teamId}/notification-config`)
        .set("Authorization", `Bearer ${coachToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe("PUT /api/teams/:teamId/notification-config", () => {
    let teamId: string;

    beforeEach(async () => {
      const createRes = await request(app)
        .post("/api/teams")
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          name: "Notif Config Write Team " + Math.random().toString(36).substring(7),
          teamLeadId: teamAdminId,
        });
      teamId = createRes.body.data.id as string;
    });

    it("allows TEAM_ADMIN (lead) to upsert notification config", async () => {
      const res = await request(app)
        .put(`/api/teams/${teamId}/notification-config`)
        .set("Authorization", `Bearer ${teamAdminToken}`)
        .send({
          reminderOffsets: [60, 1440],
          adminNotifyOnBooking: true,
          adminNotifyOnCancellation: true,
          adminNotifyOnNoShow: true,
          coachNotifyOnBooking: true,
          coachNotifyOnCancellation: true,
          coachNotifyOnNoShow: true,
          notifyLeadOnAvailability: true,
        });
      expect(res.status).toBe(200);
      expect(res.body.data.reminderOffsets).toEqual([60, 1440]);
    });

    it("prevents COACH enrolled in team from upserting notification config", async () => {
      // enroll coach
      await prisma.teamMember.create({
        data: {
          teamId,
          userId: coachId,
          isActive: true,
        },
      });

      const res = await request(app)
        .put(`/api/teams/${teamId}/notification-config`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          reminderOffsets: [60, 1440],
          adminNotifyOnBooking: true,
          adminNotifyOnCancellation: true,
          adminNotifyOnNoShow: true,
          coachNotifyOnBooking: true,
          coachNotifyOnCancellation: true,
          coachNotifyOnNoShow: true,
          notifyLeadOnAvailability: true,
        });
      expect(res.status).toBe(403);
    });
  });
});

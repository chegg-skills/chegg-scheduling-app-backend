import request from "supertest";
import app from "../../src/app";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

const getNextUtcWeekdayAt = (targetDay: number, hour: number, minute = 0): Date => {
  const now = new Date();
  const currentDay = now.getUTCDay();
  const daysAhead = (targetDay - currentDay + 7) % 7 || 7;

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysAhead,
      hour,
      minute,
      0,
      0,
    ),
  );
};

let superAdminToken: string;
let teamAdminId: string;
let coachId: string;
let teamId: string;
let teamSlug: string;
let eventId: string;
let eventSlug: string;
let coachSlug: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@public.com", "Admin1234");
  superAdminToken = admin.token;

  // Create Offering
  const offeringRes = await request(app)
    .post("/api/event-offerings")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      key: "public-offering",
      name: "Public Offering",
      description: "Offering for public",
      sortOrder: 1,
      isActive: true,
    });
  const offeringId = offeringRes.body.data.id;

  // Create Interaction Type
  const interactionRes = await request(app)
    .post("/api/event-interaction-types")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      key: "one-to-one",
      name: "One-to-One",
      description: "Interaction type",
      supportsRoundRobin: false,
      supportsMultipleHosts: false,
      minHosts: 1,
      maxHosts: 1,
      minParticipants: 1,
      maxParticipants: 1,
      sortOrder: 1,
      isActive: true,
    });
  const interactionTypeId = interactionRes.body.data.id;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@public.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  teamAdminId = teamAdmin.id;

  const coach = await registerUser(superAdminToken, {
    firstName: "Public",
    lastName: "Coach",
    email: "coach@public.com",
    password: "CoachPass1234",
    role: "COACH",
  });
  coachId = coach.id;
  coachSlug = coach.publicBookingSlug ?? "";

  // Create a team
  const teamRes = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({ name: "Public Team", description: "Discoverable team", teamLeadId: teamAdminId });
  teamId = teamRes.body.data.id;
  teamSlug = teamRes.body.data.publicBookingSlug;

  await request(app)
    .post(`/api/teams/${teamId}/members`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({ userId: coachId });

  // Create an event via API
  const eventRes = await request(app)
    .post(`/api/teams/${teamId}/events`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({
      name: "Public Intro",
      description: "Intro session",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com/session",
      isActive: true,
      offeringId,
      interactionTypeId,
      hostUserIds: [coachId],
    });

  eventId = eventRes.body.data.id;
  eventSlug = eventRes.body.data.publicBookingSlug;

  await request(app)
    .put(`/api/events/${eventId}/hosts`)
    .set("Authorization", `Bearer ${superAdminToken}`)
    .send({ hosts: [{ userId: coachId }] });
});

afterAll(clearTables);

describe("Public API", () => {
  describe("GET /api/public/teams", () => {
    it("should list active teams without authentication", async () => {
      const res = await request(app).get("/api/public/teams");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teams).toBeDefined();
      expect(res.body.data.teams.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.teams[0].name).toBe("public team");
    });
  });

  describe("GET /api/public/teams/:teamId/events", () => {
    it("should list active events for a team without authentication", async () => {
      const res = await request(app).get(`/api/public/teams/${teamId}/events`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toBeDefined();
      expect(res.body.data.events.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.events[0].name).toBe("Public Intro");
    });
  });

  describe("slug-based public booking endpoints", () => {
    it("should resolve a team by public slug", async () => {
      const res = await request(app).get(`/api/public/teams/slug/${teamSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team.publicBookingSlug).toBe(teamSlug);
    });

    it("should list a team's public events by slug", async () => {
      const res = await request(app).get(`/api/public/teams/slug/${teamSlug}/events`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.team.publicBookingSlug).toBe(teamSlug);
      expect(res.body.data.events.some((event: { id: string }) => event.id === eventId)).toBe(true);
    });

    it("should resolve an event by public slug", async () => {
      const res = await request(app).get(`/api/public/events/slug/${eventSlug}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event.publicBookingSlug).toBe(eventSlug);
      expect(res.body.data.event.teamId).toBe(teamId);
    });

    it("should resolve a coach by public slug and list their public events", async () => {
      const coachRes = await request(app).get(`/api/public/coaches/slug/${coachSlug}`);
      const eventsRes = await request(app).get(`/api/public/coaches/slug/${coachSlug}/events`);

      expect(coachRes.status).toBe(200);
      expect(coachRes.body.success).toBe(true);
      expect(coachRes.body.data.coach.publicBookingSlug).toBe(coachSlug);

      expect(eventsRes.status).toBe(200);
      expect(eventsRes.body.success).toBe(true);
      expect(eventsRes.body.data.coach.publicBookingSlug).toBe(coachSlug);
      expect(eventsRes.body.data.events.some((event: { id: string }) => event.id === eventId)).toBe(
        true,
      );
    });
  });

  describe("GET /api/public/events/:eventId/slots", () => {
    it("should return available slots without authentication", async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);

      const res = await request(app).get(`/api/public/events/${eventId}/slots`).query({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.slots)).toBe(true);
    });

    it("returns only future predefined slots that satisfy the scheduling rules", async () => {
      const allowedSlot = getNextUtcWeekdayAt(1, 15, 0);
      const blockedByNotice = new Date(Date.now() + 60 * 60 * 1000);

      await request(app)
        .patch(`/api/events/${eventId}`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          bookingMode: "FIXED_SLOTS",
          allowedWeekdays: [1],
          minimumNoticeMinutes: 180,
          maxParticipantCount: 1,
        });

      await request(app)
        .post(`/api/events/${eventId}/schedule-slots`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          startTime: blockedByNotice.toISOString(),
          endTime: new Date(blockedByNotice.getTime() + 30 * 60 * 1000).toISOString(),
        });

      await request(app)
        .post(`/api/events/${eventId}/schedule-slots`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({
          startTime: allowedSlot.toISOString(),
          endTime: new Date(allowedSlot.getTime() + 30 * 60 * 1000).toISOString(),
        });

      const rangeStart = new Date();
      const rangeEnd = new Date();
      rangeEnd.setDate(rangeStart.getDate() + 10);

      const res = await request(app).get(`/api/public/events/${eventId}/slots`).query({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const returnedStartTimes = res.body.data.slots.map(
        (slot: { startTime: string }) => slot.startTime,
      );

      expect(returnedStartTimes).toContain(allowedSlot.toISOString());
      expect(returnedStartTimes).not.toContain(blockedByNotice.toISOString());
    });

    it("should return 400 if dates are missing", async () => {
      const res = await request(app).get(`/api/public/events/${eventId}/slots`);
      expect(res.status).toBe(400);
    });
  });
});

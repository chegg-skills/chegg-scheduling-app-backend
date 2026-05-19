import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

let superAdminToken: string;
let superAdminId: string;
let coachToken: string;
let coachId: string;
let visitorToken: string;
let visitorId: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super-avail@example.com", "Admin1234");
  superAdminToken = admin.token;
  superAdminId = admin.id;

  const coach = await registerUser(superAdminToken, {
    firstName: "Coach",
    lastName: "User",
    email: "coach-avail@example.com",
    password: "Password1234",
    role: "COACH",
  });
  coachToken = coach.token;
  coachId = coach.id;

  const visitor = await registerUser(superAdminToken, {
    firstName: "Visitor",
    lastName: "User",
    email: "visitor-avail@example.com",
    password: "Password1234",
    role: "COACH",
  });
  visitorToken = visitor.token;
  visitorId = visitor.id;
});

afterAll(clearTables);

describe("Availability Domain Integration Tests", () => {
  describe("Weekly Availability", () => {
    it("COACH cannot set their own weekly availability (Policy Change)", async () => {
      const slots = [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }];

      const res = await request(app)
        .post(`/api/users/${coachId}/availability/weekly`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send(slots);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Coaches are not allowed to manage/);
    });

    it("COACH can get their own weekly availability", async () => {
      // Setup: Admin sets the availability first
      await request(app)
        .post(`/api/users/${coachId}/availability/weekly`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send([
          { dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
          { dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
        ]);

      const res = await request(app)
        .get(`/api/users/${coachId}/availability/weekly`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    it("COACH cannot set another user's availability", async () => {
      const res = await request(app)
        .post(`/api/users/${visitorId}/availability/weekly`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send([]);

      expect(res.status).toBe(403);
    });

    it("SUPER_ADMIN can set any user's availability", async () => {
      const res = await request(app)
        .post(`/api/users/${visitorId}/availability/weekly`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send([{ dayOfWeek: 0, startTime: "10:00", endTime: "11:00" }]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("rejects invalid time format (403 before 400 for COACH)", async () => {
      const res = await request(app)
        .post(`/api/users/${coachId}/availability/weekly`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send([{ dayOfWeek: 1, startTime: "9:00", endTime: "17:00" }]); // Should be 09:00

      expect(res.status).toBe(403);
    });

    it("rejects startTime after endTime (as Admin)", async () => {
      const res = await request(app)
        .post(`/api/users/${coachId}/availability/weekly`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send([{ dayOfWeek: 1, startTime: "17:00", endTime: "09:00" }]);

      expect(res.status).toBe(400);
    });
  });

  describe("Availability Exceptions", () => {
    let exceptionId: string;

    it("adds an availability exception", async () => {
      const res = await request(app)
        .post(`/api/users/${coachId}/availability/exceptions`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          date: "2026-12-25",
          isUnavailable: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isUnavailable).toBe(true);
      exceptionId = res.body.data.id;
    });

    it("lists availability exceptions", async () => {
      const res = await request(app)
        .get(`/api/users/${coachId}/availability/exceptions`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it("removes an availability exception", async () => {
      const res = await request(app)
        .delete(`/api/users/${coachId}/availability/exceptions/${exceptionId}`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);

      const listRes = await request(app)
        .get(`/api/users/${coachId}/availability/exceptions`)
        .set("Authorization", `Bearer ${coachToken}`);
      expect(listRes.body.data).toHaveLength(0);
    });

    it("returns 404 when removing non-existent exception", async () => {
      const res = await request(app)
        .delete(
          `/api/users/${coachId}/availability/exceptions/00000000-0000-0000-0000-000000000000`,
        )
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(404);
    });

    it("SUPER_ADMIN can add an exception for a coach", async () => {
      const res = await request(app)
        .post(`/api/users/${coachId}/availability/exceptions`)
        .set("Authorization", `Bearer ${superAdminToken}`)
        .send({ date: "2026-12-26", isUnavailable: true });

      expect(res.status).toBe(201);
      expect(res.body.data.isUnavailable).toBe(true);
      exceptionId = res.body.data.id;
    });

    it("SUPER_ADMIN can remove an exception for a coach", async () => {
      const res = await request(app)
        .delete(`/api/users/${coachId}/availability/exceptions/${exceptionId}`)
        .set("Authorization", `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);

      const listRes = await request(app)
        .get(`/api/users/${coachId}/availability/exceptions`)
        .set("Authorization", `Bearer ${coachToken}`);
      expect(listRes.body.data).toHaveLength(0);
    });
  });

  describe("Effective Availability", () => {
    it("calculates effective availability", async () => {
      const res = await request(app)
        .get(`/api/users/${coachId}/availability/effective?from=2026-03-01&to=2026-03-31`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("weekly");
      expect(res.body.data).toHaveProperty("exceptions");
    });

    it("rejects missing query parameters", async () => {
      const res = await request(app)
        .get(`/api/users/${coachId}/availability/effective`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(400);
    });
  });
});

describe("Timezone edge cases in slot availability", () => {
  let istCoachId: string;
  let tokyoCoachId: string;
  let istEventId: string;
  let tokyoEventId: string;
  let tzTeamId: string;

  // Returns the UTC Date of the next occurrence of day-of-week (0=Sun) at the given UTC hour/min.
  // Ensures at least 24 h in the future so no slot falls within the notice window.
  const getNextWeekdayAtUTC = (dow: number, hour: number, min = 0): Date => {
    const now = new Date();
    const currentDay = now.getUTCDay();
    const daysAhead = (dow - currentDay + 7) % 7 || 7;
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, hour, min),
    );
  };

  beforeAll(async () => {
    // Reuse the super admin token from the outer beforeAll for all authenticated requests.
    // Create a TEAM_ADMIN to satisfy the teamLeadId requirement on team creation.
    const tzTeamAdmin = await registerUser(superAdminToken, {
      firstName: "TZ",
      lastName: "Admin",
      email: "tz-teamadmin@example.com",
      password: "Password1234",
      role: "TEAM_ADMIN",
    });

    const istCoach = await registerUser(superAdminToken, {
      firstName: "IST",
      lastName: "Coach",
      email: "coach-ist-tz@example.com",
      password: "Password1234",
      role: "COACH",
    });
    istCoachId = istCoach.id;

    const tokyoCoach = await registerUser(superAdminToken, {
      firstName: "Tokyo",
      lastName: "Coach",
      email: "coach-tokyo-tz@example.com",
      password: "Password1234",
      role: "COACH",
    });
    tokyoCoachId = tokyoCoach.id;

    // Set timezones directly in DB (bypasses user-profile API which may not expose timezone).
    await prisma.user.update({ where: { id: istCoachId }, data: { timezone: "Asia/Kolkata" } });
    await prisma.user.update({ where: { id: tokyoCoachId }, data: { timezone: "Asia/Tokyo" } });

    // Create an event type (required field for event creation).
    const eventTypeRes = await request(app)
      .post("/api/event-types")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        key: "tz-test-offering",
        name: "TZ Test Offering",
        description: "Timezone edge case tests",
        sortOrder: 99,
        isActive: true,
      });
    const eventTypeId = eventTypeRes.body.data.id as string;

    // Create a team for these tests.
    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: "TZ Test Team", description: "Timezone tests", teamLeadId: tzTeamAdmin.id });
    tzTeamId = teamRes.body.data.id;

    await request(app)
      .post(`/api/teams/${tzTeamId}/members`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ userId: istCoachId });
    await request(app)
      .post(`/api/teams/${tzTeamId}/members`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ userId: tokyoCoachId });

    // IST event — 30-min COACH_AVAILABILITY
    const istEventRes = await request(app)
      .post(`/api/teams/${tzTeamId}/events`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "IST Timezone Event",
        description: "IST availability test",
        interactionType: "ONE_TO_ONE",
        assignmentStrategy: "DIRECT",
        durationSeconds: 1800,
        locationType: "VIRTUAL",
        locationValue: "https://meet.example.com",
        isActive: true,
        eventTypeId,
      });
    istEventId = istEventRes.body.data.id;
    await request(app)
      .put(`/api/events/${istEventId}/coaches`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ coaches: [{ userId: istCoachId }] });

    // IST coach weekly availability: Mon-Fri 09:00-17:00 IST.
    // Because IST is UTC+5:30 (half-hour offset), slots land at :30 UTC boundaries —
    // e.g. 09:00 IST = 03:30 UTC, 09:30 IST = 04:00 UTC. This exercises the timezone
    // conversion path in isWithinWeeklyAvailability.
    await request(app)
      .post(`/api/users/${istCoachId}/availability/weekly`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send([
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" },
      ]);

    // Tokyo event — 2-hour COACH_AVAILABILITY (sessions that span local midnight)
    const tokyoEventRes = await request(app)
      .post(`/api/teams/${tzTeamId}/events`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: "Tokyo Timezone Event",
        description: "Cross-midnight test",
        interactionType: "ONE_TO_ONE",
        assignmentStrategy: "DIRECT",
        durationSeconds: 7200,
        locationType: "VIRTUAL",
        locationValue: "https://meet.example.com",
        isActive: true,
        eventTypeId,
      });
    tokyoEventId = tokyoEventRes.body.data.id;
    await request(app)
      .put(`/api/events/${tokyoEventId}/coaches`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ coaches: [{ userId: tokyoCoachId }] });

    // Tokyo coach: Mon 22:00-23:59 JST + Tue 00:00-02:00 JST — availability spans midnight
    await request(app)
      .post(`/api/users/${tokyoCoachId}/availability/weekly`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send([
        { dayOfWeek: 1, startTime: "22:00", endTime: "23:59" },
        { dayOfWeek: 2, startTime: "00:00", endTime: "02:00" },
      ]);
  });

  it("returns slots for a coach in IST (UTC+5:30 half-hour offset)", async () => {
    // Monday 04:00 UTC = 09:30 IST. Coach has "09:00"–"17:00" IST availability.
    // The IST half-hour offset means slots land at :30 UTC boundaries (e.g. 03:30, 04:00, 04:30 UTC).
    // Verifies that toLocalAvailabilityInfo correctly converts UTC→IST for the availability window check.
    const monday = getNextWeekdayAtUTC(1, 0, 0);
    const tuesdayMidnight = new Date(monday.getTime() + 24 * 60 * 60 * 1000);

    const res = await request(app)
      .get(`/api/public/events/${istEventId}/slots`)
      .query({ startDate: monday.toISOString(), endDate: tuesdayMidnight.toISOString() });

    expect(res.status).toBe(200);
    const slots: Array<{ startTime: string }> = res.body.data.slots;
    // 09:30 IST = 04:00 UTC
    const slotAt0400 = slots.find((s) => {
      const d = new Date(s.startTime);
      return d.getUTCHours() === 4 && d.getUTCMinutes() === 0;
    });
    expect(slotAt0400).toBeDefined();
  });

  it("returns a cross-midnight session when the coach has split availability across two days", async () => {
    // Monday 13:30 UTC = 22:30 JST. A 2-hr session ends at 15:30 UTC = 00:30 JST (Tuesday).
    // Old code: hard-rejected because dateString differs across midnight.
    // New code: split-day check passes (Mon 22:30–23:59 ✓, Tue 00:00–00:30 ✓).
    const monday = getNextWeekdayAtUTC(1, 0, 0);
    const tuesdayMidnight = new Date(monday.getTime() + 24 * 60 * 60 * 1000);

    const res = await request(app)
      .get(`/api/public/events/${tokyoEventId}/slots`)
      .query({ startDate: monday.toISOString(), endDate: tuesdayMidnight.toISOString() });

    expect(res.status).toBe(200);
    const slots: Array<{ startTime: string }> = res.body.data.slots;
    // 22:30 JST = 13:30 UTC
    const crossMidnightSlot = slots.find((s) => {
      const d = new Date(s.startTime);
      return d.getUTCHours() === 13 && d.getUTCMinutes() === 30;
    });
    expect(crossMidnightSlot).toBeDefined();
  });

  it("returns 200 with empty slots (not 500) when the coach has an invalid timezone string", async () => {
    await prisma.user.update({
      where: { id: istCoachId },
      data: { timezone: "Not/A_Timezone" },
    });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const res = await request(app)
      .get(`/api/public/events/${istEventId}/slots`)
      .query({ startDate: startDate.toISOString(), endDate: endDate.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.data.slots).toHaveLength(0);

    // Restore valid timezone so subsequent tests are not affected.
    await prisma.user.update({ where: { id: istCoachId }, data: { timezone: "Asia/Kolkata" } });
  });

  it("accepts a student timezone query param and returns 200 without errors", async () => {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const res = await request(app).get(`/api/public/events/${istEventId}/slots`).query({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timezone: "Pacific/Kiritimati",
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.slots)).toBe(true);
  });
});

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

describe("Slot availability — conflict and exception blocking", () => {
  // Each test creates its own isolated team/event/coach to avoid cross-test pollution.

  // Returns the UTC Date of the next occurrence of day-of-week (0=Sun) at the given UTC hour/min.
  // Always returns a date at least 24 h in the future so no slot falls within the notice window.
  const getNextWeekday = (dow: number, hour: number, min = 0): Date => {
    const now = new Date();
    const currentDay = now.getUTCDay();
    const daysAhead = (dow - currentDay + 7) % 7 || 7;
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysAhead, hour, min),
    );
  };

  // Uses the module-level superAdminToken — bootstrapAdmin can only be called once per test run.
  async function createConflictTestEvent(opts: {
    durationSeconds: number;
    bufferAfterMinutes?: number;
    coachTimezone?: string;
    weeklySlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
    slug: string;
  }) {
    const coach = await registerUser(superAdminToken, {
      firstName: "Conflict",
      lastName: `Coach-${opts.slug}`,
      email: `conflict-coach-${opts.slug}@example.com`,
      password: "Password1234",
      role: "COACH",
    });
    if (opts.coachTimezone) {
      await prisma.user.update({ where: { id: coach.id }, data: { timezone: opts.coachTimezone } });
    }

    const teamAdminUser = await registerUser(superAdminToken, {
      firstName: "Lead",
      lastName: `Admin-${opts.slug}`,
      email: `conflict-lead-${opts.slug}@example.com`,
      password: "Password1234",
      role: "TEAM_ADMIN",
    });

    const etRes = await request(app)
      .post("/api/event-types")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ key: `conflict-et-${opts.slug}`, name: `ET ${opts.slug}`, sortOrder: 1, isActive: true });
    const eventTypeId = etRes.body.data.id as string;

    const teamRes = await request(app)
      .post("/api/teams")
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ name: `Conflict Team ${opts.slug}`, teamLeadId: teamAdminUser.id });
    const teamId = teamRes.body.data.id as string;

    await request(app)
      .post(`/api/teams/${teamId}/members`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ userId: coach.id });

    const evRes = await request(app)
      .post(`/api/teams/${teamId}/events`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({
        name: `Conflict Event ${opts.slug}`,
        interactionType: "ONE_TO_ONE",
        assignmentStrategy: "DIRECT",
        durationSeconds: opts.durationSeconds,
        bufferAfterMinutes: opts.bufferAfterMinutes ?? 0,
        locationType: "VIRTUAL",
        locationValue: "https://meet.example.com",
        isActive: true,
        eventTypeId,
      });
    const eventId = evRes.body.data.id as string;

    await request(app)
      .put(`/api/events/${eventId}/coaches`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send({ coaches: [{ userId: coach.id }] });

    await request(app)
      .post(`/api/users/${coach.id}/availability/weekly`)
      .set("Authorization", `Bearer ${superAdminToken}`)
      .send(opts.weeklySlots);

    return { coachId: coach.id, eventId, teamId };
  }

  it("blocks a slot when the coach has a confirmed booking at that time", async () => {
    const monday10 = getNextWeekday(1, 10, 0); // Monday 10:00 UTC
    const monday11 = new Date(monday10.getTime() + 60 * 60 * 1000); // 11:00 UTC
    const mondayStart = getNextWeekday(1, 0, 0);
    const mondayEnd = new Date(mondayStart.getTime() + 24 * 60 * 60 * 1000);

    const { coachId, eventId, teamId } = await createConflictTestEvent({
      slug: "conflict-basic",
      durationSeconds: 3600, // 60 min
      weeklySlots: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
    });

    // Seed a confirmed booking directly at 10:00–11:00 on Monday
    await prisma.booking.create({
      data: {
        studentName: "Existing Student",
        studentEmail: "existing@conflict.com",
        teamId,
        eventId,
        coachUserId: coachId,
        startTime: monday10,
        endTime: monday11,
        status: "CONFIRMED",
      },
    });

    const res = await request(app)
      .get(`/api/public/events/${eventId}/slots`)
      .query({ startDate: mondayStart.toISOString(), endDate: mondayEnd.toISOString() });

    expect(res.status).toBe(200);
    const slots: Array<{ startTime: string }> = res.body.data.slots;

    // 10:00 slot must be blocked
    const blockedSlot = slots.find((s) => new Date(s.startTime).getTime() === monday10.getTime());
    expect(blockedSlot).toBeUndefined();

    // 09:00 and 11:00 slots must be available (coach is free)
    const slot09 = slots.find((s) => new Date(s.startTime).getUTCHours() === 9);
    const slot11 = slots.find((s) => new Date(s.startTime).getUTCHours() === 11);
    expect(slot09).toBeDefined();
    expect(slot11).toBeDefined();
  });

  it("returns no slots when the coach has an unavailability exception for that day", async () => {
    const tuesday = getNextWeekday(2, 0, 0); // Tuesday midnight UTC
    const wednesdayMidnight = new Date(tuesday.getTime() + 24 * 60 * 60 * 1000);

    const { coachId, eventId } = await createConflictTestEvent({
      slug: "exception-block",
      durationSeconds: 1800, // 30 min
      weeklySlots: [{ dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }],
    });

    // Add an all-day unavailability exception for Tuesday
    await prisma.userAvailabilityException.create({
      data: {
        userId: coachId,
        date: tuesday,
        isUnavailable: true,
      },
    });

    const res = await request(app)
      .get(`/api/public/events/${eventId}/slots`)
      .query({ startDate: tuesday.toISOString(), endDate: wednesdayMidnight.toISOString() });

    expect(res.status).toBe(200);
    expect(res.body.data.slots).toHaveLength(0);
  });

  it("blocks a slot within the buffer window after an existing booking", async () => {
    // Event: 60-min duration, 15-min buffer. Coach available Mon 09:00–17:00.
    // Booking at 10:00–11:00. Slot at 11:00 falls within the 15-min buffer → blocked.
    // Slot at 11:15 is outside the buffer → available.
    const monday10 = getNextWeekday(1, 10, 0);
    const monday11 = new Date(monday10.getTime() + 60 * 60 * 1000);
    const monday1115 = new Date(monday10.getTime() + 75 * 60 * 1000);
    const mondayStart = getNextWeekday(1, 0, 0);
    const mondayEnd = new Date(mondayStart.getTime() + 24 * 60 * 60 * 1000);

    const { coachId, eventId, teamId } = await createConflictTestEvent({
      slug: "buffer-block",
      durationSeconds: 3600,
      bufferAfterMinutes: 15,
      weeklySlots: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
    });

    await prisma.booking.create({
      data: {
        studentName: "Buffer Student",
        studentEmail: "buffer@conflict.com",
        teamId,
        eventId,
        coachUserId: coachId,
        startTime: monday10,
        endTime: monday11,
        status: "CONFIRMED",
      },
    });

    const res = await request(app)
      .get(`/api/public/events/${eventId}/slots`)
      .query({ startDate: mondayStart.toISOString(), endDate: mondayEnd.toISOString() });

    expect(res.status).toBe(200);
    const slots: Array<{ startTime: string }> = res.body.data.slots;

    // 11:00 slot must be blocked (within 15-min buffer of the 10:00 booking)
    const slot11 = slots.find((s) => new Date(s.startTime).getTime() === monday11.getTime());
    expect(slot11).toBeUndefined();

    // 11:15 slot must be available (outside the buffer)
    const slot1115 = slots.find((s) => new Date(s.startTime).getTime() === monday1115.getTime());
    expect(slot1115).toBeDefined();
  });

  it("blocks a cross-midnight slot when a conflict exists on the next calendar day (validates batchFetchEnd)", async () => {
    // Coach in Tokyo (UTC+9). Availability: Mon 22:00–23:59 JST + Tue 00:00–02:00 JST.
    // A 2-hour slot starting Mon 22:30 JST (= Mon 13:30 UTC) ends Tue 00:30 JST (= Mon 15:30 UTC).
    // A confirmed booking on Tue 00:05 JST (= Mon 15:05 UTC) overlaps this slot.
    // Without the batchFetchEnd extension the booking would not be fetched and the slot
    // would incorrectly appear available.

    const { coachId, eventId, teamId } = await createConflictTestEvent({
      slug: "cross-midnight-conflict",
      durationSeconds: 7200, // 2 hours
      coachTimezone: "Asia/Tokyo",
      weeklySlots: [
        { dayOfWeek: 1, startTime: "22:00", endTime: "23:59" }, // Monday JST
        { dayOfWeek: 2, startTime: "00:00", endTime: "02:00" }, // Tuesday JST
      ],
    });

    // next Monday 00:00 UTC = the UTC anchor for "next Monday"
    const mondayUTC = getNextWeekday(1, 0, 0);
    // Mon 13:30 UTC = Mon 22:30 JST — the cross-midnight slot start
    const slotStart = new Date(mondayUTC.getTime() + 13 * 60 * 60 * 1000 + 30 * 60 * 1000);
    // Mon 15:05 UTC = Tue 00:05 JST — the conflicting booking start
    const conflictStart = new Date(mondayUTC.getTime() + 15 * 60 * 60 * 1000 + 5 * 60 * 1000);
    const conflictEnd = new Date(conflictStart.getTime() + 60 * 60 * 1000); // 1 hour booking

    await prisma.booking.create({
      data: {
        studentName: "Next Day Student",
        studentEmail: "nextday@conflict.com",
        teamId,
        eventId,
        coachUserId: coachId,
        startTime: conflictStart,
        endTime: conflictEnd,
        status: "CONFIRMED",
      },
    });

    const mondayEnd = new Date(mondayUTC.getTime() + 24 * 60 * 60 * 1000);
    const res = await request(app)
      .get(`/api/public/events/${eventId}/slots`)
      .query({ startDate: mondayUTC.toISOString(), endDate: mondayEnd.toISOString() });

    expect(res.status).toBe(200);
    const slots: Array<{ startTime: string }> = res.body.data.slots;

    // The Mon 22:30 JST (13:30 UTC) slot must be blocked by the Tue 00:05 JST booking
    const crossMidnightSlot = slots.find(
      (s) => new Date(s.startTime).getTime() === slotStart.getTime(),
    );
    expect(crossMidnightSlot).toBeUndefined();
  });
});

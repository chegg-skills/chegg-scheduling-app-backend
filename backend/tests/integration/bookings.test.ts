import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { AssignmentStrategy, BookingStatus, EventLocationType } from "@prisma/client";

const getNextUtcWeekdayAt = (targetDay: number, hour: number, minute = 0): Date => {
  const now = new Date();
  const currentDay = now.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
  const target = new Date(
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

  return target;
};

let adminToken: string;
let teamId: string;
let eventTypeId: string;
let coachId: string;
let coachToken: string;
let coach2Id: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("admin@test.com", "Admin1234");
  adminToken = admin.token;

  // Create Team
  const team = await prisma.team.create({
    data: {
      name: "Test Team",
      createdById: admin.id,
      teamLeadId: admin.id,
      publicBookingSlug: "test-team-bookings",
    },
  });
  teamId = team.id;

  // Create Coach 1
  const coach = await registerUser(adminToken, {
    firstName: "Coach",
    lastName: "One",
    email: "coach1@test.com",
    password: "Coach1234",
    role: "COACH",
  });
  coachId = coach.id;
  coachToken = coach.token;

  // Create Coach 2
  const coach2 = await registerUser(adminToken, {
    firstName: "Coach",
    lastName: "Two",
    email: "coach2@test.com",
    password: "Coach1234",
    role: "COACH",
  });
  coach2Id = coach2.id;

  // Both coaches must be active team members so getBookableEvent's TeamMember filter keeps them
  await prisma.teamMember.createMany({
    data: [
      { teamId: team.id, userId: coach.id },
      { teamId: team.id, userId: coach2.id },
    ],
  });

  // Create Offering
  const offering = await prisma.eventType.create({
    data: {
      key: "test_offering",
      name: "Test Offering",
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  eventTypeId = offering.id;
});

afterAll(async () => {
  await clearTables();
});

describe("Booking Domain Integration Tests", () => {
  let eventId: string;

  beforeEach(async () => {
    // Clean bookings before each test if needed, but clearTables is in afterAll/beforeAll.
    // For individual tests, we'll create dedicated events.
    const event = await prisma.event.create({
      data: {
        name: "Test Direct Event",
        teamId,
        eventTypeId: eventTypeId,
        interactionType: "ONE_TO_ONE",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationSeconds: 3600, // 1 hour
        locationType: EventLocationType.VIRTUAL,
        locationValue: "Zoom",
        createdById: coachId,
        updatedById: coachId,
        publicBookingSlug: `test-direct-event-${Date.now()}`,
        coaches: {
          create: {
            coachUserId: coachId,
            coachOrder: 1,
          },
        },
      },
    });
    eventId = event.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.userWeeklyAvailability.deleteMany();
    await prisma.userAvailabilityException.deleteMany();
    await prisma.event.deleteMany();
  });

  describe("POST /api/bookings (DIRECT)", () => {
    beforeEach(async () => {
      // Set Coach Availability: Monday 09:00 - 17:00
      await prisma.userWeeklyAvailability.create({
        data: {
          userId: coachId,
          dayOfWeek: 1, // Monday
          startTime: "09:00",
          endTime: "17:00",
        },
      });
    });

    it("successfully creates a booking for an available slot", async () => {
      const zoomIsvLink =
        "https://students.skills.chegg.com/meeting/join/7d26db62-1f37-49f5-8b49-97a66444007b";
      await request(app)
        .patch(`/api/users/${coachId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ zoomIsvLink });

      const startTime = getNextUtcWeekdayAt(1, 10, 0).toISOString(); // Next Monday 10:00 UTC

      const res = await request(app).post("/api/bookings").send({
        studentName: "John Doe",
        studentEmail: "john@example.com",
        teamId,
        eventId,
        startTime,
        timezone: "UTC",
      });

      if (res.status !== 201) console.log(JSON.stringify(res.body, null, 2));
      expect(res.status).toBe(201);
      expect(res.body.data.booking.studentName).toBe("John Doe");
      expect(res.body.data.booking.coachUserId).toBe(coachId);
      expect(res.body.data.booking.meetingJoinUrl).toBe(zoomIsvLink);
    });

    it("creates and reuses a student profile across bookings with the same email", async () => {
      const firstStartTime = getNextUtcWeekdayAt(1, 10, 0).toISOString();
      const secondStartTime = getNextUtcWeekdayAt(1, 12, 0).toISOString();

      const firstRes = await request(app).post("/api/bookings").send({
        studentName: "Jane Student",
        studentEmail: "jane@example.com",
        teamId,
        eventId,
        startTime: firstStartTime,
        timezone: "UTC",
      });

      const secondRes = await request(app).post("/api/bookings").send({
        studentName: "Jane Student",
        studentEmail: "jane@example.com",
        teamId,
        eventId,
        startTime: secondStartTime,
        timezone: "UTC",
      });

      expect(firstRes.status).toBe(201);
      expect(secondRes.status).toBe(201);
      expect(firstRes.body.data.booking.student).toBeDefined();
      expect(firstRes.body.data.booking.student.email).toBe("jane@example.com");
      expect(firstRes.body.data.booking.studentId ?? firstRes.body.data.booking.student?.id).toBe(
        secondRes.body.data.booking.studentId ?? secondRes.body.data.booking.student?.id,
      );
    });

    it("returns 409 conflict if host is unavailable (outside weekly schedule)", async () => {
      const startTime = getNextUtcWeekdayAt(1, 18, 0).toISOString(); // Next Monday 18:00 UTC

      const res = await request(app).post("/api/bookings").send({
        studentName: "John Doe",
        studentEmail: "john@example.com",
        teamId,
        eventId,
        startTime,
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("not available");
    });

    it("returns 409 conflict if there is a booking overlap", async () => {
      const startTime = getNextUtcWeekdayAt(1, 10, 0).toISOString();

      // Create existing booking
      await prisma.booking.create({
        data: {
          studentName: "First One",
          studentEmail: "first@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime: new Date(startTime),
          endTime: new Date(new Date(startTime).getTime() + 3600 * 1000),
          status: "CONFIRMED",
        },
      });

      const res = await request(app).post("/api/bookings").send({
        studentName: "John Doe",
        studentEmail: "john@example.com",
        teamId,
        eventId,
        startTime,
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("not available");
    });

    it("rejects bookings that do not match a predefined fixed slot", async () => {
      const allowedStart = getNextUtcWeekdayAt(1, 10, 0);
      const invalidStart = getNextUtcWeekdayAt(1, 11, 0);

      await prisma.event.update({
        where: { id: eventId },
        data: {
          bookingMode: "FIXED_SLOTS",
          minimumNoticeMinutes: 0,
          maxParticipantCount: 1,
        },
      });

      await prisma.eventScheduleSlot.create({
        data: {
          eventId,
          startTime: allowedStart,
          endTime: new Date(allowedStart.getTime() + 3600 * 1000),
        },
      });

      const res = await request(app).post("/api/bookings").send({
        studentName: "Slot Mismatch",
        studentEmail: "slot-mismatch@example.com",
        teamId,
        eventId,
        startTime: invalidStart.toISOString(),
        timezone: "UTC",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/predefined slot/i);
    });

    it("rejects bookings when a fixed slot has reached its participant limit", async () => {
      const slotStart = getNextUtcWeekdayAt(1, 10, 0);
      const slotEnd = new Date(slotStart.getTime() + 3600 * 1000);

      await prisma.event.update({
        where: { id: eventId },
        data: {
          bookingMode: "FIXED_SLOTS",
          minimumNoticeMinutes: 0,
          maxParticipantCount: 1,
        },
      });

      const scheduleSlot = await prisma.eventScheduleSlot.create({
        data: {
          eventId,
          startTime: slotStart,
          endTime: slotEnd,
        },
      });

      await prisma.booking.create({
        data: {
          studentName: "Existing Student",
          studentEmail: "existing@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          scheduleSlotId: scheduleSlot.id,
          startTime: slotStart,
          endTime: slotEnd,
          status: "CONFIRMED",
        },
      });

      const res = await request(app).post("/api/bookings").send({
        studentName: "Capacity Student",
        studentEmail: "capacity@example.com",
        teamId,
        eventId,
        startTime: slotStart.toISOString(),
        timezone: "UTC",
      });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/capacity|participant limit|full/i);
    });
  });

  describe("POST /api/bookings (ROUND-ROBIN)", () => {
    let rrEventId: string;

    beforeEach(async () => {
      const event = await prisma.event.create({
        data: {
          name: "Test RR Event",
          teamId,
          eventTypeId: eventTypeId,
          interactionType: "MANY_TO_ONE",
          assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
          durationSeconds: 3600,
          locationType: EventLocationType.VIRTUAL,
          locationValue: "Zoom",
          createdById: coachId,
          updatedById: coachId,
          publicBookingSlug: `test-rr-event-${Date.now()}`,
          coaches: {
            create: [
              { coachUserId: coachId, coachOrder: 1 },
              { coachUserId: coach2Id, coachOrder: 2 },
            ],
          },
        },
      });
      rrEventId = event.id;

      // Set Coach 1: Monday 09:00 - 12:00
      await prisma.userWeeklyAvailability.create({
        data: { userId: coachId, dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
      });
      // Set Coach 2: Monday 13:00 - 17:00
      await prisma.userWeeklyAvailability.create({
        data: { userId: coach2Id, dayOfWeek: 1, startTime: "13:00", endTime: "17:00" },
      });
    });

    it("assigns the first available host and updates routing state", async () => {
      const startTime = getNextUtcWeekdayAt(1, 9, 30).toISOString(); // Next Monday 09:30 UTC

      const res = await request(app).post("/api/bookings").send({
        studentName: "Student RR",
        studentEmail: "stu@rr.com",
        teamId,
        eventId: rrEventId,
        startTime,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.coachUserId).toBe(coachId);

      // Routing state should now point to coachOrder 2
      const routing = await prisma.eventRoutingState.findUnique({ where: { eventId: rrEventId } });
      expect(routing?.nextCoachOrder).toBe(2);
    });

    it("skips unavailable host and assigns the next available one", async () => {
      const startTime = getNextUtcWeekdayAt(1, 14, 0).toISOString(); // Next Monday 14:00 UTC

      const res = await request(app).post("/api/bookings").send({
        studentName: "Student RR 2",
        studentEmail: "stu2@rr.com",
        teamId,
        eventId: rrEventId,
        startTime,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.coachUserId).toBe(coach2Id);
    });

    it("prefers coach with fewer team-wide bookings when both are available", async () => {
      // Both coaches are available on Monday 09:00–12:00 — give Coach 1 an existing
      // confirmed booking on this team so their team-wide count is higher.
      await prisma.booking.create({
        data: {
          teamId,
          eventId: rrEventId,
          coachUserId: coachId,
          studentName: "Prior Student",
          studentEmail: "prior@test.com",
          startTime: getNextUtcWeekdayAt(1, 9, 0),
          endTime: getNextUtcWeekdayAt(1, 10, 0),
          timezone: "UTC",
          status: BookingStatus.CONFIRMED,
        },
      });

      // Make Coach 2 available during the morning window too
      await prisma.userWeeklyAvailability.create({
        data: { userId: coach2Id, dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
      });

      const startTime = getNextUtcWeekdayAt(1, 10, 0).toISOString(); // Monday 10:00 — both available

      const res = await request(app).post("/api/bookings").send({
        studentName: "Student RR 3",
        studentEmail: "stu3@rr.com",
        teamId,
        eventId: rrEventId,
        startTime,
      });

      expect(res.status).toBe(201);
      // Coach 2 has 0 team-wide bookings vs Coach 1's 1 — should be preferred
      expect(res.body.data.booking.coachUserId).toBe(coach2Id);
    });
  });

  describe("GET /api/bookings search", () => {
    beforeEach(async () => {
      const baseStart = getNextUtcWeekdayAt(1, 9, 0);

      await prisma.booking.createMany({
        data: [
          {
            studentName: "Alice Johnson",
            studentEmail: "alice@example.com",
            teamId,
            eventId,
            coachUserId: coachId,
            startTime: baseStart,
            endTime: new Date(baseStart.getTime() + 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "Bob Carter",
            studentEmail: "bob.carter@example.com",
            teamId,
            eventId,
            coachUserId: coachId,
            startTime: new Date(baseStart.getTime() + 2 * 3600 * 1000),
            endTime: new Date(baseStart.getTime() + 3 * 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "Charlie King",
            studentEmail: "charlie@example.com",
            teamId,
            eventId,
            coachUserId: coach2Id,
            startTime: new Date(baseStart.getTime() + 4 * 3600 * 1000),
            endTime: new Date(baseStart.getTime() + 5 * 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
        ],
      });
    });

    it("filters bookings by partial student name", async () => {
      const res = await request(app)
        .get("/api/bookings")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ search: "ali" });

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.bookings[0].studentName).toBe("Alice Johnson");
    });

    it("filters bookings by partial student email", async () => {
      const res = await request(app)
        .get("/api/bookings")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ search: "bob.carter" });

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.bookings[0].studentEmail).toBe("bob.carter@example.com");
    });

    it("filters bookings by partial booking ID", async () => {
      const booking = await prisma.booking.findFirst({
        where: { studentEmail: "alice@example.com" },
        select: { id: true },
      });

      expect(booking).toBeTruthy();

      const res = await request(app)
        .get("/api/bookings")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({ search: booking!.id.slice(0, 8) });

      expect(res.status).toBe(200);
      expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.bookings.some((b: { id: string }) => b.id === booking!.id)).toBe(true);
    });

    it("still enforces coach scoping while searching", async () => {
      const res = await request(app)
        .get("/api/bookings")
        .set("Authorization", `Bearer ${coachToken}`)
        .query({ search: "charlie" });

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(0);
    });
  });

  describe("GET /api/bookings date range filtering", () => {
    beforeEach(async () => {
      // Use specific dates for predictability
      const date1 = new Date("2026-04-10T10:00:00Z");
      const date2 = new Date("2026-05-10T10:00:00Z");
      const date3 = new Date("2026-06-10T10:00:00Z");

      await prisma.booking.createMany({
        data: [
          {
            studentName: "April Student",
            studentEmail: "april@test.com",
            teamId,
            eventId,
            coachUserId: coachId,
            startTime: date1,
            endTime: new Date(date1.getTime() + 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "May Student",
            studentEmail: "may@test.com",
            teamId,
            eventId,
            coachUserId: coachId,
            startTime: date2,
            endTime: new Date(date2.getTime() + 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "June Student",
            studentEmail: "june@test.com",
            teamId,
            eventId,
            coachUserId: coachId,
            startTime: date3,
            endTime: new Date(date3.getTime() + 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
        ],
      });
    });

    it("filters bookings by date range (April only)", async () => {
      const res = await request(app)
        .get("/api/bookings")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({
          startDate: "2026-04-01T00:00:00.000Z",
          endDate: "2026-04-30T23:59:59.999Z",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(1);
      expect(res.body.data.bookings[0].studentName).toBe("April Student");
    });

    it("filters bookings by date range (May and June)", async () => {
      const res = await request(app)
        .get("/api/bookings")
        .set("Authorization", `Bearer ${adminToken}`)
        .query({
          startDate: "2026-05-01T00:00:00.000Z",
          endDate: "2026-06-30T23:59:59.999Z",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.bookings).toHaveLength(2);
      expect(res.body.data.bookings.map((b: any) => b.studentName)).toContain("May Student");
      expect(res.body.data.bookings.map((b: any) => b.studentName)).toContain("June Student");
    });

    it("returns all bookings if no date range is provided", async () => {
      const res = await request(app)
        .get("/api/bookings")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // 3 from this beforeEach + 3 from the previous describe block's beforeEach (if not cleared)
      // But clearTables is in afterAll and deleteMany in afterEach.
      // Wait, afterEach deletes all bookings. So it should be Exactly 3.
      expect(res.body.data.bookings.length).toBe(3);
    });
  });

  /**
   * Regression test for the co-coach conflict detection bug.
   *
   * Bug: getCoachConflicts only queried coachUserId (lead role). A coach appearing in
   * coCoachUserIds of an existing booking was invisible to the conflict check, allowing
   * them to be double-booked as lead or co-coach in an overlapping session.
   *
   * Fix: OR condition covers both coachUserId and coCoachUserIds: { has: userId }.
   */
  describe("Co-coach conflict detection", () => {
    let targetEventId: string;

    beforeEach(async () => {
      // DIRECT event — coach2 is the only candidate so any conflict on coach2 produces a 409.
      const event = await prisma.event.create({
        data: {
          name: "Co-coach Conflict Test Event",
          teamId,
          eventTypeId: eventTypeId,
          interactionType: "ONE_TO_ONE",
          assignmentStrategy: AssignmentStrategy.DIRECT,
          durationSeconds: 3600,
          locationType: EventLocationType.VIRTUAL,
          locationValue: "Zoom",
          createdById: coachId,
          updatedById: coachId,
          publicBookingSlug: `cocoach-conflict-${Date.now()}`,
          coaches: {
            create: { coachUserId: coach2Id, coachOrder: 1 },
          },
        },
      });
      targetEventId = event.id;

      await prisma.userWeeklyAvailability.createMany({
        data: [
          { userId: coachId, dayOfWeek: 1, startTime: "08:00", endTime: "18:00" },
          { userId: coach2Id, dayOfWeek: 1, startTime: "08:00", endTime: "18:00" },
        ],
      });
    });

    afterEach(async () => {
      await prisma.booking.deleteMany();
      await prisma.userWeeklyAvailability.deleteMany();
      await prisma.userAvailabilityException.deleteMany();
      await prisma.event.deleteMany();
    });

    it("returns 409 when the only eligible coach is already a co-coach in an overlapping booking", async () => {
      const existingStart = getNextUtcWeekdayAt(1, 9, 0);
      const existingEnd = new Date(existingStart.getTime() + 60 * 60 * 1000); // 9:00–10:00

      // Seed: coachId is the lead, coach2Id is a co-coach for 9:00–10:00.
      // Before the fix, getCoachConflicts ignored coCoachUserIds, so coach2Id would appear
      // available and the overlapping booking below would incorrectly succeed.
      await prisma.booking.create({
        data: {
          studentName: "Existing Student",
          studentEmail: "existing@cocoach.com",
          teamId,
          eventId: targetEventId,
          coachUserId: coachId,
          coCoachUserIds: [coach2Id],
          startTime: existingStart,
          endTime: existingEnd,
          status: "CONFIRMED",
        },
      });

      // Attempt to book targetEventId at 9:15–10:15 (overlaps with existing 9:00–10:00 session).
      // coach2Id is the only candidate; with the fix they are correctly detected as unavailable.
      const overlapStart = getNextUtcWeekdayAt(1, 9, 15);
      const res = await request(app).post("/api/bookings").send({
        studentName: "New Student",
        studentEmail: "new@cocoach.com",
        teamId,
        eventId: targetEventId,
        startTime: overlapStart.toISOString(),
        timezone: "UTC",
      });

      expect(res.status).toBe(409);
    });

    it("allows booking when the co-coach overlap is on a different day", async () => {
      const mondayStart = getNextUtcWeekdayAt(1, 9, 0);
      const mondayEnd = new Date(mondayStart.getTime() + 60 * 60 * 1000);

      // coach2Id is a co-coach on Monday 9:00–10:00
      await prisma.booking.create({
        data: {
          studentName: "Monday Student",
          studentEmail: "monday@cocoach.com",
          teamId,
          eventId: targetEventId,
          coachUserId: coachId,
          coCoachUserIds: [coach2Id],
          startTime: mondayStart,
          endTime: mondayEnd,
          status: "CONFIRMED",
        },
      });

      // Book targetEventId on the following Tuesday at 9:00 — no conflict.
      await prisma.userWeeklyAvailability.create({
        data: { userId: coach2Id, dayOfWeek: 2, startTime: "08:00", endTime: "18:00" },
      });

      const tuesdayStart = getNextUtcWeekdayAt(2, 9, 0);
      const res = await request(app).post("/api/bookings").send({
        studentName: "Tuesday Student",
        studentEmail: "tuesday@cocoach.com",
        teamId,
        eventId: targetEventId,
        startTime: tuesdayStart.toISOString(),
        timezone: "UTC",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.coachUserId).toBe(coach2Id);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/bookings/:bookingId/reschedule
  // ─────────────────────────────────────────────────────────────
  describe("POST /api/bookings/:bookingId/reschedule", () => {
    let bookingId: string;
    let rescheduleToken: string;

    beforeEach(async () => {
      await prisma.userWeeklyAvailability.create({
        data: { userId: coachId, dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      });

      const startTime = getNextUtcWeekdayAt(1, 10, 0);
      const booking = await prisma.booking.create({
        data: {
          studentName: "Reschedule Student",
          studentEmail: "reschedule@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 3600 * 1000),
          status: "CONFIRMED",
        },
      });
      bookingId = booking.id;
      rescheduleToken = booking.rescheduleToken!;
    });

    it("reschedules a booking using a valid token (200, new startTime saved)", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 11, 0);

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: newStartTime.toISOString(), token: rescheduleToken });

      expect(res.status).toBe(200);
      expect(new Date(res.body.data.booking.startTime).getTime()).toBe(newStartTime.getTime());
    });

    it("rotates the rescheduleToken after a successful reschedule (old token rejected with 404)", async () => {
      const firstNewStart = getNextUtcWeekdayAt(1, 11, 0);

      await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: firstNewStart.toISOString(), token: rescheduleToken });

      // Same old token is now invalid
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: getNextUtcWeekdayAt(1, 12, 0).toISOString(), token: rescheduleToken });

      expect(res.status).toBe(404);
    });

    it("rejects reschedule when booking status is COMPLETED (403)", async () => {
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "COMPLETED" } });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(), token: rescheduleToken });

      expect(res.status).toBe(403);
    });

    it("rejects reschedule when booking status is NO_SHOW (403)", async () => {
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "NO_SHOW" } });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(), token: rescheduleToken });

      expect(res.status).toBe(403);
    });

    it("rejects reschedule when booking status is CANCELLED (403)", async () => {
      await prisma.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(), token: rescheduleToken });

      expect(res.status).toBe(403);
    });

    it("rejects reschedule when session ended more than 2 hours ago (403)", async () => {
      // Set startTime to 4 hours ago — session end (1h) + 2h grace = 3h ago, so 4h is well past
      const pastStart = new Date(Date.now() - 4 * 60 * 60 * 1000);
      await prisma.booking.update({ where: { id: bookingId }, data: { startTime: pastStart } });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(), token: rescheduleToken });

      expect(res.status).toBe(403);
    });

    it("rejects an invalid/unknown token (404)", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(),
          token: "nonexistent-token-xyz",
        });

      expect(res.status).toBe(404);
    });

    it("allows reschedule via session auth (no token) for an authenticated admin", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 11, 0);

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ startTime: newStartTime.toISOString() });

      expect(res.status).toBe(200);
      expect(new Date(res.body.data.booking.startTime).getTime()).toBe(newStartTime.getTime());
    });

    it("returns 401 when neither session auth nor token is provided", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString() });

      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/bookings/:bookingId/reschedule (ROUND_ROBIN)
  //
  // Covers two bugs fixed together: (1) rescheduleBooking previously only
  // checked the originally-assigned coach's availability and never fell back
  // to the round-robin pool; (2) the availability check didn't exclude the
  // booking's own prior record, so an overlapping reschedule always saw the
  // original coach as "conflicting with themselves" even with nothing else
  // booked.
  // ─────────────────────────────────────────────────────────────
  describe("POST /api/bookings/:bookingId/reschedule (ROUND_ROBIN)", () => {
    let rrEventId: string;
    let bookingId: string;
    let rescheduleToken: string;

    beforeEach(async () => {
      const event = await prisma.event.create({
        data: {
          name: "Test RR Reschedule Event",
          teamId,
          eventTypeId,
          interactionType: "ONE_TO_ONE",
          assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
          durationSeconds: 3600,
          locationType: EventLocationType.VIRTUAL,
          locationValue: "Zoom",
          createdById: coachId,
          updatedById: coachId,
          publicBookingSlug: `test-rr-reschedule-${Date.now()}`,
          coaches: {
            create: [
              { coachUserId: coachId, coachOrder: 1 },
              { coachUserId: coach2Id, coachOrder: 2 },
            ],
          },
        },
      });
      rrEventId = event.id;

      // Both coaches available all day Monday — isolates the tests to booking
      // conflicts rather than weekly-schedule edges.
      await prisma.userWeeklyAvailability.create({
        data: { userId: coachId, dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      });
      await prisma.userWeeklyAvailability.create({
        data: { userId: coach2Id, dayOfWeek: 1, startTime: "09:00", endTime: "17:00" },
      });

      const startTime = getNextUtcWeekdayAt(1, 10, 0); // Monday 10:00-11:00
      const booking = await prisma.booking.create({
        data: {
          studentName: "RR Reschedule Student",
          studentEmail: "rr-reschedule@example.com",
          teamId,
          eventId: rrEventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 3600 * 1000),
          status: "CONFIRMED",
        },
      });
      bookingId = booking.id;
      rescheduleToken = booking.rescheduleToken!;
    });

    it("keeps the same coach when rescheduling to an overlapping time with no other conflicts", async () => {
      // 10:00-11:00 -> 10:15-11:15 overlaps the booking's own original time by
      // 45 minutes. Without excluding the booking's own record, Coach 1 would
      // incorrectly appear to conflict with themselves.
      const newStartTime = getNextUtcWeekdayAt(1, 10, 15);

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: newStartTime.toISOString(), token: rescheduleToken });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.coachUserId).toBe(coachId);

      // No rotation decision was made — the cursor should not have moved.
      const routing = await prisma.eventRoutingState.findUnique({ where: { eventId: rrEventId } });
      expect(routing?.nextCoachOrder ?? 1).toBe(1);
    });

    it("falls back to another round-robin coach when the original coach has a genuine conflict at the new time", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 10, 15);

      // A second, unrelated booking genuinely occupies Coach 1 at the new time.
      await prisma.booking.create({
        data: {
          studentName: "Unrelated Student",
          studentEmail: "unrelated@example.com",
          teamId,
          eventId: rrEventId,
          coachUserId: coachId,
          startTime: newStartTime,
          endTime: new Date(newStartTime.getTime() + 3600 * 1000),
          status: "CONFIRMED",
        },
      });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: newStartTime.toISOString(), token: rescheduleToken });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.coachUserId).toBe(coach2Id);

      // A real rotation decision was made — updateRoutingState's upsert should
      // have run (coach2 has the highest coachOrder, so the cursor wraps back
      // to 1 — the same as its unset default, so we assert the row now exists
      // rather than asserting a specific value).
      const routing = await prisma.eventRoutingState.findUnique({ where: { eventId: rrEventId } });
      expect(routing).not.toBeNull();
    });

    it("returns 409 when every coach in the pool is genuinely busy at the new time", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 10, 15);

      await prisma.booking.createMany({
        data: [
          {
            studentName: "Unrelated Student 1",
            studentEmail: "unrelated1@example.com",
            teamId,
            eventId: rrEventId,
            coachUserId: coachId,
            startTime: newStartTime,
            endTime: new Date(newStartTime.getTime() + 3600 * 1000),
            status: "CONFIRMED",
          },
          {
            studentName: "Unrelated Student 2",
            studentEmail: "unrelated2@example.com",
            teamId,
            eventId: rrEventId,
            coachUserId: coach2Id,
            startTime: newStartTime,
            endTime: new Date(newStartTime.getTime() + 3600 * 1000),
            status: "CONFIRMED",
          },
        ],
      });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/reschedule`)
        .send({ startTime: newStartTime.toISOString(), token: rescheduleToken });

      expect(res.status).toBe(409);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/bookings/:bookingId/cancel
  // ─────────────────────────────────────────────────────────────
  describe("POST /api/bookings/:bookingId/cancel", () => {
    let bookingId: string;
    let cancelToken: string;

    beforeEach(async () => {
      const futureStart = getNextUtcWeekdayAt(1, 10, 0);
      const booking = await prisma.booking.create({
        data: {
          studentName: "Cancel Student",
          studentEmail: "cancel@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime: futureStart,
          endTime: new Date(futureStart.getTime() + 3600 * 1000),
          status: "CONFIRMED",
        },
      });
      bookingId = booking.id;
      cancelToken = booking.rescheduleToken!;
    });

    it("cancels a booking using a valid token (200, status=CANCELLED)", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .send({ token: cancelToken });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe(BookingStatus.CANCELLED);
    });

    it("saves the cancellationReason when provided", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .send({ token: cancelToken, cancellationReason: "Schedule conflict" });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.cancellationReason).toBe("Schedule conflict");
    });

    it("sets cancellationReason to null when omitted", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .send({ token: cancelToken });

      expect(res.status).toBe(200);
      expect(res.body.data.booking.cancellationReason).toBeNull();
    });

    it("does NOT rotate the rescheduleToken after cancellation", async () => {
      await request(app).post(`/api/bookings/${bookingId}/cancel`).send({ token: cancelToken });

      const updated = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(updated!.rescheduleToken).toBe(cancelToken);
    });

    it("returns 409 when booking is already cancelled", async () => {
      await request(app).post(`/api/bookings/${bookingId}/cancel`).send({ token: cancelToken });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .send({ token: cancelToken });

      expect(res.status).toBe(409);
    });

    it("returns 403 when session has already started", async () => {
      const pastStart = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      await prisma.booking.update({ where: { id: bookingId }, data: { startTime: pastStart } });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .send({ token: cancelToken });

      expect(res.status).toBe(403);
    });

    it("returns 404 for an invalid/unknown token", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .send({ token: "invalid-token-xyz" });

      expect(res.status).toBe(404);
    });

    it("returns 401 when neither session auth nor token is provided", async () => {
      const res = await request(app).post(`/api/bookings/${bookingId}/cancel`).send({});

      expect(res.status).toBe(401);
    });

    it("allows an authenticated SUPER_ADMIN to cancel without a token (200)", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.booking.status).toBe(BookingStatus.CANCELLED);
    });

    it("allows the assigned COACH to cancel their own booking (200)", async () => {
      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({});

      expect(res.status).toBe(200);
    });

    it("returns 403 when a COACH tries to cancel a booking they are not assigned to", async () => {
      // coach2 is not assigned to this booking
      const coach2 = await prisma.user.findFirst({ where: { email: "coach2@test.com" } });
      const coach2TokenRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "coach2@test.com", password: "Coach1234" });
      const coach2Token = coach2TokenRes.body.data?.token ?? coach2TokenRes.headers["set-cookie"];

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/cancel`)
        .set("Authorization", `Bearer ${coach2TokenRes.body.data?.token}`)
        .send({});

      // coach2 is not lead or co-host → 403
      expect(res.status).toBe(403);
      void coach2; // silence unused var
    });
  });

  // ─────────────────────────────────────────────────────────────
  // POST /api/bookings/:bookingId/follow-up
  // ─────────────────────────────────────────────────────────────
  describe("POST /api/bookings/:bookingId/follow-up", () => {
    let bookingId: string;

    beforeEach(async () => {
      // Set Coach Availability: Monday 09:00 - 17:00
      await prisma.userWeeklyAvailability.create({
        data: {
          userId: coachId,
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        },
      });

      const startTime = getNextUtcWeekdayAt(1, 10, 0); // Monday 10:00 UTC
      const booking = await prisma.booking.create({
        data: {
          studentName: "Followup Student",
          studentEmail: "followup@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 3600 * 1000),
          status: "COMPLETED",
        },
      });
      bookingId = booking.id;
    });

    it("books a follow-up session successfully for an authorized admin (201)", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 11, 0); // Monday 11:00 UTC

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: newStartTime.toISOString(),
          timezone: "UTC",
          notes: "Need more practice on chain rule.",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.studentName).toBe("Followup Student");
      expect(res.body.data.booking.studentEmail).toBe("followup@example.com");
      expect(res.body.data.booking.coachUserId).toBe(coachId);
      expect(res.body.data.booking.notes).toBe("Need more practice on chain rule.");
      expect(new Date(res.body.data.booking.startTime).getTime()).toBe(newStartTime.getTime());
    });

    it("books a follow-up session successfully for the assigned coach (201)", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 11, 0);

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          startTime: newStartTime.toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(201);
    });

    it("returns 403 when a coach is not assigned to the booking and not in team", async () => {
      const coach2TokenRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "coach2@test.com", password: "Coach1234" });
      const coach2Token = coach2TokenRes.body.data?.token;

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${coach2Token}`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(403);
      void coach2Token;
    });

    it("returns 400 when original booking is not completed", async () => {
      const pendingBooking = await prisma.booking.create({
        data: {
          studentName: "Pending Student",
          studentEmail: "pending@example.com",
          teamId,
          eventId,
          coachUserId: coachId,
          startTime: getNextUtcWeekdayAt(1, 14, 0),
          endTime: getNextUtcWeekdayAt(1, 15, 0),
          status: "CONFIRMED",
        },
      });

      const res = await request(app)
        .post(`/api/bookings/${pendingBooking.id}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 16, 0).toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("only be booked for completed bookings");
    });

    it("returns 409 conflict when student has overlapping bookings", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 11, 0);

      // Create a second event to avoid ONE_TO_ONE event capacity limit on the same event
      const event2 = await prisma.event.create({
        data: {
          name: "Test Direct Event 2",
          teamId,
          eventTypeId: eventTypeId,
          interactionType: "ONE_TO_ONE",
          assignmentStrategy: AssignmentStrategy.DIRECT,
          durationSeconds: 3600,
          locationType: EventLocationType.VIRTUAL,
          locationValue: "Zoom",
          createdById: coachId,
          updatedById: coachId,
          publicBookingSlug: `test-direct-event-2-${Date.now()}`,
          coaches: {
            create: {
              coachUserId: coach2Id,
              coachOrder: 1,
            },
          },
        },
      });

      // Create an existing overlapping booking for the same student (with a different coach so the first coach is still free)
      await prisma.booking.create({
        data: {
          studentName: "Followup Student",
          studentEmail: "followup@example.com",
          teamId,
          eventId: event2.id,
          coachUserId: coach2Id,
          startTime: newStartTime,
          endTime: new Date(newStartTime.getTime() + 3600 * 1000),
          status: "CONFIRMED",
        },
      });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: newStartTime.toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("overlapping");
    });

    it("returns 400 when coach is no longer active", async () => {
      await prisma.user.update({
        where: { id: coachId },
        data: { isActive: false },
      });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("coach is no longer active");

      // Reset coach state for subsequent tests
      await prisma.user.update({
        where: { id: coachId },
        data: { isActive: true },
      });
    });

    it("returns 404 when original booking is not found", async () => {
      const res = await request(app)
        .post(`/api/bookings/00000000-0000-0000-0000-000000000000/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(404);
    });

    it("stores empty string notes as-is, not replaced by auto-generated note", async () => {
      const newStartTime = getNextUtcWeekdayAt(1, 11, 0);

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: newStartTime.toISOString(),
          timezone: "UTC",
          notes: "",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.notes).toBe("");
    });

    it("returns 400 when the event is inactive", async () => {
      await prisma.event.update({ where: { id: eventId }, data: { isActive: false } });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/event.*inactive|inactive.*event/i);

      await prisma.event.update({ where: { id: eventId }, data: { isActive: true } });
    });

    it("returns 400 when the coach is no longer assigned to the event", async () => {
      await prisma.eventCoach.update({
        where: { eventId_coachUserId: { eventId, coachUserId: coachId } },
        data: { isActive: false },
      });

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no longer assigned/i);

      await prisma.eventCoach.update({
        where: { eventId_coachUserId: { eventId, coachUserId: coachId } },
        data: { isActive: true },
      });
    });

    it("returns 403 when a TEAM_ADMIN is not the team lead for the booking's team", async () => {
      const otherAdmin = await request(app)
        .post("/api/auth/register")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          firstName: "Other",
          lastName: "Admin",
          email: "other-admin@test.com",
          password: "Admin1234",
          role: "TEAM_ADMIN",
        });
      const otherAdminToken = otherAdmin.body.data?.token;

      const res = await request(app)
        .post(`/api/bookings/${bookingId}/follow-up`)
        .set("Authorization", `Bearer ${otherAdminToken}`)
        .send({
          startTime: getNextUtcWeekdayAt(1, 11, 0).toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(403);
    });
  });

  describe("Custom questions and answers", () => {
    let customEventId: string;

    beforeEach(async () => {
      // Set Coach Availability: Monday 09:00 - 17:00
      await prisma.userWeeklyAvailability.create({
        data: {
          userId: coachId,
          dayOfWeek: 1, // Monday
          startTime: "09:00",
          endTime: "17:00",
        },
      });

      const event = await prisma.event.create({
        data: {
          name: "Custom Questions Event",
          teamId,
          eventTypeId: eventTypeId,
          interactionType: "ONE_TO_ONE",
          assignmentStrategy: AssignmentStrategy.DIRECT,
          durationSeconds: 3600,
          locationType: EventLocationType.VIRTUAL,
          locationValue: "Zoom",
          createdById: coachId,
          updatedById: coachId,
          publicBookingSlug: `custom-questions-${Date.now()}`,
          useDefaultQuestions: false,
          customQuestions: ["What is your background?", "What are your goals?"],
          coaches: {
            create: {
              coachUserId: coachId,
              coachOrder: 1,
            },
          },
        },
      });
      customEventId = event.id;
    });

    afterEach(async () => {
      await prisma.booking.deleteMany();
      await prisma.userWeeklyAvailability.deleteMany();
      await prisma.event.deleteMany();
    });

    it("successfully creates a booking with custom answers and clears default fields", async () => {
      const startTime = getNextUtcWeekdayAt(1, 10, 0).toISOString();

      const res = await request(app).post("/api/bookings").send({
        studentName: "Custom Answer Student",
        studentEmail: "custom@example.com",
        teamId,
        eventId: customEventId,
        startTime,
        timezone: "UTC",
        customAnswers: ["I am a CS freshman", "Learn React"],
      });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.customQuestions).toEqual(["What is your background?", "What are your goals?"]);
      expect(res.body.data.booking.customAnswers).toEqual(["I am a CS freshman", "Learn React"]);
      // Standard intake fields should be null/cleared
      expect(res.body.data.booking.specificQuestion).toBeNull();
      expect(res.body.data.booking.triedSolutions).toBeNull();
    });

    it("sanitizes HTML/script tags from custom answers", async () => {
      const startTime = getNextUtcWeekdayAt(1, 10, 0).toISOString();

      const res = await request(app).post("/api/bookings").send({
        studentName: "Malicious Student",
        studentEmail: "malicious@example.com",
        teamId,
        eventId: customEventId,
        startTime,
        timezone: "UTC",
        customAnswers: ["<script>alert('xss')</script>CS", "<b>React</b>"],
      });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.customAnswers).toEqual(["CS", "React"]);
    });

    it("rejects booking if customAnswers has more than 5 elements", async () => {
      const startTime = getNextUtcWeekdayAt(1, 10, 0).toISOString();

      const res = await request(app).post("/api/bookings").send({
        studentName: "Too Many Answers",
        studentEmail: "toomany@example.com",
        teamId,
        eventId: customEventId,
        startTime,
        timezone: "UTC",
        customAnswers: ["A1", "A2", "A3", "A4", "A5", "A6"],
      });

      expect(res.status).toBe(400);
    });

    it("books a follow-up session successfully with custom answers", async () => {
      const startTime = getNextUtcWeekdayAt(1, 10, 0);
      const originalBooking = await prisma.booking.create({
        data: {
          studentName: "Followup Custom Student",
          studentEmail: "followup_custom@example.com",
          teamId,
          eventId: customEventId,
          coachUserId: coachId,
          startTime,
          endTime: new Date(startTime.getTime() + 3600 * 1000),
          status: "COMPLETED",
          customQuestions: ["What is your background?", "What are your goals?"],
          customAnswers: ["Freshman", "Learn React"],
        },
      });

      const newStartTime = getNextUtcWeekdayAt(1, 11, 0).toISOString();

      const res = await request(app)
        .post(`/api/bookings/${originalBooking.id}/follow-up`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          startTime: newStartTime,
          timezone: "UTC",
          customAnswers: ["Sophomore now", "Learn Node.js"],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.customQuestions).toEqual(["What is your background?", "What are your goals?"]);
      expect(res.body.data.booking.customAnswers).toEqual(["Sophomore now", "Learn Node.js"]);
      expect(res.body.data.booking.specificQuestion).toBeNull();
    });
  });
});

describe("Anonymous booking (allowAnonymousBooking=true)", () => {
    let anonEventId: string;
    let anonSlotStart: Date;
    const locationValue = "https://meet.example.com/anonymous-session";

    beforeAll(async () => {
      // Build a ONE_TO_MANY anonymous event with a coach in the pool
      const event = await prisma.event.create({
        data: {
          name: `Anonymous Event ${Date.now()}`,
          teamId,
          eventTypeId,
          interactionType: "ONE_TO_MANY",
          assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
          bookingMode: "FIXED_SLOTS",
          meetingLinkSource: "EVENT_LOCATION",
          allowAnonymousBooking: true,
          durationSeconds: 1800,
          locationType: EventLocationType.VIRTUAL,
          locationValue,
          minimumNoticeMinutes: 0,
          maxParticipantCount: 10,
          publicBookingSlug: `anon-event-${Date.now()}`,
          createdById: coachId,
          updatedById: coachId,
          coaches: {
            create: { coachUserId: coachId, coachOrder: 1 },
          },
        },
      });
      anonEventId = event.id;

      anonSlotStart = getNextUtcWeekdayAt(2, 14, 0);
      await prisma.eventScheduleSlot.create({
        data: {
          eventId: anonEventId,
          startTime: anonSlotStart,
          endTime: new Date(anonSlotStart.getTime() + 1800 * 1000),
          capacity: 10,
        },
      });
    });

    it("creates a booking with null coachUserId for an anonymous event", async () => {
      const res = await request(app).post("/api/bookings").send({
        studentName: "Anon Student",
        studentEmail: `anon-student-${Date.now()}@example.com`,
        teamId,
        eventId: anonEventId,
        startTime: anonSlotStart.toISOString(),
        timezone: "UTC",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.coachUserId).toBeNull();
    });

    it("sets meetingJoinUrl to the event locationValue for an anonymous booking", async () => {
      const res = await request(app).post("/api/bookings").send({
        studentName: "Anon Student 2",
        studentEmail: `anon-student2-${Date.now()}@example.com`,
        teamId,
        eventId: anonEventId,
        startTime: anonSlotStart.toISOString(),
        timezone: "UTC",
      });

      expect(res.status).toBe(201);
      expect(res.body.data.booking.meetingJoinUrl).toBe(locationValue);
    });
});

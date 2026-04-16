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
let offeringId: string;
let interactionTypeId: string;
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

  // Create Offering
  const offering = await prisma.eventOffering.create({
    data: {
      key: "test_offering",
      name: "Test Offering",
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  offeringId = offering.id;

  // Create Interaction Type (with Round-Robin support)
  const interactionType = await prisma.eventInteractionType.create({
    data: {
      key: "test_interaction",
      name: "Test Interaction",
      supportsRoundRobin: true,
      supportsMultipleHosts: true,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });
  interactionTypeId = interactionType.id;
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
        offeringId,
        interactionTypeId,
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationSeconds: 3600, // 1 hour
        locationType: EventLocationType.VIRTUAL,
        locationValue: "Zoom",
        createdById: coachId,
        updatedById: coachId,
        publicBookingSlug: `test-direct-event-${Date.now()}`,
        hosts: {
          create: {
            hostUserId: coachId,
            hostOrder: 1,
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
      expect(res.body.data.booking.hostUserId).toBe(coachId);
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
          hostUserId: coachId,
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
          allowedWeekdays: [1],
          minimumNoticeMinutes: 0,
          minParticipantCount: 1,
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
          allowedWeekdays: [1],
          minimumNoticeMinutes: 0,
          minParticipantCount: 1,
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
          hostUserId: coachId,
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
          offeringId,
          interactionTypeId,
          assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
          durationSeconds: 3600,
          locationType: EventLocationType.VIRTUAL,
          locationValue: "Zoom",
          createdById: coachId,
          updatedById: coachId,
          publicBookingSlug: `test-rr-event-${Date.now()}`,
          hosts: {
            create: [
              { hostUserId: coachId, hostOrder: 1 },
              { hostUserId: coach2Id, hostOrder: 2 },
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
      expect(res.body.data.booking.hostUserId).toBe(coachId);

      // Routing state should now point to hostOrder 2
      const routing = await prisma.eventRoutingState.findUnique({ where: { eventId: rrEventId } });
      expect(routing?.nextHostOrder).toBe(2);
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
      expect(res.body.data.booking.hostUserId).toBe(coach2Id);
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
            hostUserId: coachId,
            startTime: baseStart,
            endTime: new Date(baseStart.getTime() + 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "Bob Carter",
            studentEmail: "bob.carter@example.com",
            teamId,
            eventId,
            hostUserId: coachId,
            startTime: new Date(baseStart.getTime() + 2 * 3600 * 1000),
            endTime: new Date(baseStart.getTime() + 3 * 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "Charlie King",
            studentEmail: "charlie@example.com",
            teamId,
            eventId,
            hostUserId: coach2Id,
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
            hostUserId: coachId,
            startTime: date1,
            endTime: new Date(date1.getTime() + 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "May Student",
            studentEmail: "may@test.com",
            teamId,
            eventId,
            hostUserId: coachId,
            startTime: date2,
            endTime: new Date(date2.getTime() + 3600 * 1000),
            status: BookingStatus.CONFIRMED,
          },
          {
            studentName: "June Student",
            studentEmail: "june@test.com",
            teamId,
            eventId,
            hostUserId: coachId,
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
});

import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

let superAdminToken: string;
let teamAdminToken: string;
let coachToken: string;
let otherCoachToken: string;

let superAdminId: string;
let teamAdminId: string;
let coachId: string;

let groupEventId: string;
let pastBookingId: string;
let pastPendingBookingId: string;
let pastCancelledBookingId: string;
let futureBookingId: string;
let groupSlotId: string;
let groupBookingId: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@test.com", "Admin1234");
  superAdminToken = admin.token;
  superAdminId = admin.id;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Team",
    lastName: "Lead",
    email: "lead@test.com",
    password: "LeadPass1234",
    role: "TEAM_ADMIN",
  });
  teamAdminToken = teamAdmin.token;
  teamAdminId = teamAdmin.id;

  const coach = await registerUser(superAdminToken, {
    firstName: "Casey",
    lastName: "Coach",
    email: "casey@test.com",
    password: "CoachPass1234",
    role: "COACH",
  });
  coachToken = coach.token;
  coachId = coach.id;

  const otherCoach = await registerUser(superAdminToken, {
    firstName: "Other",
    lastName: "Coach",
    email: "other@test.com",
    password: "OtherPass1234",
    role: "COACH",
  });
  otherCoachToken = otherCoach.token;

  const team = await prisma.team.create({
    data: {
      name: "Test Team",
      teamLeadId: teamAdminId,
      createdById: superAdminId,
      isActive: true,
      publicBookingSlug: "test-team",
    },
  });

  // Coach must be an active team member so getBookableEvent's TeamMember filter keeps them
  await prisma.teamMember.create({ data: { teamId: team.id, userId: coachId } });

  const eventType = await prisma.eventType.create({
    data: {
      key: "test_type",
      name: "Test Type",
      isActive: true,
      createdById: superAdminId,
      updatedById: superAdminId,
    },
  });

  const oneOnOneEvent = await prisma.event.create({
    data: {
      name: "1:1 Session",
      teamId: team.id,
      eventTypeId: eventType.id,
      interactionType: "ONE_TO_ONE",
      assignmentStrategy: "DIRECT",
      durationSeconds: 3600,
      locationType: "VIRTUAL",
      locationValue: "https://zoom.us",
      isActive: true,
      createdById: superAdminId,
      updatedById: superAdminId,
      publicBookingSlug: "test-1to1-event",
    },
  });

  const groupEvent = await prisma.event.create({
    data: {
      name: "Group Session",
      teamId: team.id,
      eventTypeId: eventType.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      durationSeconds: 3600,
      locationType: "VIRTUAL",
      locationValue: "https://zoom.us",
      isActive: true,
      createdById: superAdminId,
      updatedById: superAdminId,
      publicBookingSlug: "test-group-event",
    },
  });
  groupEventId = groupEvent.id;

  const slot = await prisma.eventScheduleSlot.create({
    data: {
      eventId: groupEvent.id,
      startTime: new Date(Date.now() - 3 * 3600 * 1000),
      endTime: new Date(Date.now() - 2 * 3600 * 1000),
      assignedCoachId: coachId,
      isActive: true,
    },
  });
  groupSlotId = slot.id;

  const pastStart = new Date(Date.now() - 3 * 3600 * 1000);
  const pastEnd = new Date(Date.now() - 2 * 3600 * 1000);
  const pastBooking = await prisma.booking.create({
    data: {
      studentName: "John Past",
      studentEmail: "john@past.com",
      teamId: team.id,
      eventId: oneOnOneEvent.id,
      coachUserId: coachId,
      startTime: pastStart,
      endTime: pastEnd,
      status: "CONFIRMED",
    },
  });
  pastBookingId = pastBooking.id;

  const pastPendingBooking = await prisma.booking.create({
    data: {
      studentName: "John Pending",
      studentEmail: "pending@past.com",
      teamId: team.id,
      eventId: oneOnOneEvent.id,
      coachUserId: coachId,
      startTime: pastStart,
      endTime: pastEnd,
      status: "PENDING",
    },
  });
  pastPendingBookingId = pastPendingBooking.id;

  const pastCancelledBooking = await prisma.booking.create({
    data: {
      studentName: "John Cancelled",
      studentEmail: "cancel@past.com",
      teamId: team.id,
      eventId: oneOnOneEvent.id,
      coachUserId: coachId,
      startTime: pastStart,
      endTime: pastEnd,
      status: "CANCELLED",
    },
  });
  pastCancelledBookingId = pastCancelledBooking.id;

  const futureStart = new Date(Date.now() + 2 * 3600 * 1000);
  const futureEnd = new Date(Date.now() + 3 * 3600 * 1000);
  const futureBooking = await prisma.booking.create({
    data: {
      studentName: "John Future",
      studentEmail: "john@future.com",
      teamId: team.id,
      eventId: oneOnOneEvent.id,
      coachUserId: coachId,
      startTime: futureStart,
      endTime: futureEnd,
      status: "CONFIRMED",
    },
  });
  futureBookingId = futureBooking.id;

  const groupBooking = await prisma.booking.create({
    data: {
      studentName: "Group Student",
      studentEmail: "group@past.com",
      teamId: team.id,
      eventId: groupEvent.id,
      coachUserId: coachId,
      scheduleSlotId: slot.id,
      startTime: pastStart,
      endTime: pastEnd,
      status: "CONFIRMED",
    },
  });
  groupBookingId = groupBooking.id;
});

afterAll(clearTables);

describe("Booking Session Logs API", () => {
  describe("GET /api/bookings/:bookingId/log", () => {
    it("returns null when no log exists yet", async () => {
      const res = await request(app)
        .get(`/api/bookings/${pastBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeNull();
    });

    it("rejects 403 for unauthorized coaches", async () => {
      const res = await request(app)
        .get(`/api/bookings/${pastBookingId}/log`)
        .set("Authorization", `Bearer ${otherCoachToken}`);

      expect(res.status).toBe(403);
    });

    it("rejects 400 for malformed booking id (param schema validation)", async () => {
      const res = await request(app)
        .get(`/api/bookings/not-a-uuid/log`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(400);
    });

    it("returns 404 when booking does not exist", async () => {
      const res = await request(app)
        .get(`/api/bookings/00000000-0000-0000-0000-000000000000/log`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/bookings/:bookingId/log", () => {
    it("rejects 400 when the session has not started yet", async () => {
      const res = await request(app)
        .post(`/api/bookings/${futureBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          topicsDiscussed: "Not started yet",
          summary: "This should fail",
          attended: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/before it has started/);
    });

    it("rejects 409 when the booking is a group booking (has scheduleSlotId)", async () => {
      const res = await request(app)
        .post(`/api/bookings/${groupBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({ topicsDiscussed: "Should redirect", attended: true });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/schedule view/i);
    });

    it("rejects 403 when the caller is neither lead nor co-coach nor admin", async () => {
      const res = await request(app)
        .post(`/api/bookings/${pastBookingId}/log`)
        .set("Authorization", `Bearer ${otherCoachToken}`)
        .send({ topicsDiscussed: "Should fail", attended: true });

      expect(res.status).toBe(403);
    });

    it("allows the assigned coach to log a past session and flips status to COMPLETED", async () => {
      const res = await request(app)
        .post(`/api/bookings/${pastBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          topicsDiscussed: "TypeScript generics",
          summary: "Covered standard Zod schema design.",
          coachNotes: "Very active participant.",
          attended: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.topicsDiscussed).toBe("TypeScript generics");
      expect(res.body.data.bookingId).toBe(pastBookingId);

      const booking = await prisma.booking.findUnique({ where: { id: pastBookingId } });
      expect(booking?.status).toBe("COMPLETED");

      const attendance = await prisma.sessionAttendance.findUnique({
        where: { bookingId: pastBookingId },
      });
      expect(attendance?.attended).toBe(true);
      expect(attendance?.sessionLogId).toBe(res.body.data.id);
    });

    it("upsert edits the existing log and flips status to NO_SHOW when attended=false", async () => {
      const res = await request(app)
        .post(`/api/bookings/${pastBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          topicsDiscussed: "TypeScript generics (edited)",
          summary: "Covered advanced Zod schema design.",
          attended: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.topicsDiscussed).toBe("TypeScript generics (edited)");

      const booking = await prisma.booking.findUnique({ where: { id: pastBookingId } });
      expect(booking?.status).toBe("NO_SHOW");

      const attendance = await prisma.sessionAttendance.findUnique({
        where: { bookingId: pastBookingId },
      });
      expect(attendance?.attended).toBe(false);
    });

    it("admin can write the log regardless of coach assignment", async () => {
      const res = await request(app)
        .post(`/api/bookings/${pastBookingId}/log`)
        .set("Authorization", `Bearer ${teamAdminToken}`)
        .send({
          topicsDiscussed: "Team admin override",
          attended: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.topicsDiscussed).toBe("Team admin override");

      const booking = await prisma.booking.findUnique({ where: { id: pastBookingId } });
      expect(booking?.status).toBe("COMPLETED");
    });

    it("does not flip status when booking is PENDING", async () => {
      const res = await request(app)
        .post(`/api/bookings/${pastPendingBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({ topicsDiscussed: "Pending log", attended: true });

      expect(res.status).toBe(200);
      const booking = await prisma.booking.findUnique({
        where: { id: pastPendingBookingId },
      });
      expect(booking?.status).toBe("PENDING");
    });

    it("does not flip status when booking is CANCELLED", async () => {
      const res = await request(app)
        .post(`/api/bookings/${pastCancelledBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({ topicsDiscussed: "Cancelled log", attended: true });

      expect(res.status).toBe(200);
      const booking = await prisma.booking.findUnique({
        where: { id: pastCancelledBookingId },
      });
      expect(booking?.status).toBe("CANCELLED");
    });
  });

  describe("GET /api/bookings/:bookingId/log — slot-based path", () => {
    it("returns the slot's log when the booking has a scheduleSlotId", async () => {
      // First write a log to the slot via the slot endpoint
      await request(app)
        .post(`/api/events/${groupEventId}/schedule-slots/${groupSlotId}/log`)
        .set("Authorization", `Bearer ${teamAdminToken}`)
        .send({
          topicsDiscussed: "Slot topics",
          summary: "Slot summary",
          attendance: [{ bookingId: groupBookingId, attended: true }],
        });

      const res = await request(app)
        .get(`/api/bookings/${groupBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data?.topicsDiscussed).toBe("Slot topics");
      expect(res.body.data?.scheduleSlotId).toBe(groupSlotId);
    });
  });

  describe("DB-level XOR CHECK constraint", () => {
    it("blocks a raw insert that sets both scheduleSlotId and bookingId", async () => {
      const bookingForXor = await prisma.booking.findUnique({
        where: { id: pastBookingId },
      });
      expect(bookingForXor).toBeTruthy();

      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO "SessionLog" ("id", "scheduleSlotId", "bookingId", "loggedByUserId", "updatedAt") VALUES ($1, $2, $3, $4, now())`,
          "11111111-1111-1111-1111-111111111111",
          groupSlotId,
          pastBookingId,
          coachId,
        ),
      ).rejects.toThrow();
    });

    it("blocks a raw insert that sets neither scheduleSlotId nor bookingId", async () => {
      await expect(
        prisma.$executeRawUnsafe(
          `INSERT INTO "SessionLog" ("id", "loggedByUserId", "updatedAt") VALUES ($1, $2, now())`,
          "22222222-2222-2222-2222-222222222222",
          coachId,
        ),
      ).rejects.toThrow();
    });
  });
});

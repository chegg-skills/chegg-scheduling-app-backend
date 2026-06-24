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

let eventId: string;
let testBookingId: string;
let pastBookingId: string;

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
  eventId = oneOnOneEvent.id;

  // Create an active coach assignment to the event
  await prisma.eventCoach.create({
    data: {
      eventId: oneOnOneEvent.id,
      coachUserId: coachId,
      coachOrder: 1,
      isActive: true,
    },
  });

  // Seed weekly availability for all days of the week for coachId
  for (let i = 0; i < 7; i++) {
    await prisma.userWeeklyAvailability.create({
      data: {
        userId: coachId,
        dayOfWeek: i,
        startTime: "00:00",
        endTime: "23:59",
      },
    });
  }

  // Create standard future booking (creates BOOKING_CREATED & BOOKING_CONFIRMED activities)
  const futureStart = new Date(Date.now() + 24 * 3600 * 1000);
  const res = await request(app)
    .post("/api/bookings")
    .send({
      studentName: "John Doe",
      studentEmail: "john@doe.com",
      teamId: team.id,
      eventId: oneOnOneEvent.id,
      startTime: futureStart.toISOString(),
      timezone: "UTC",
      notes: "First booking test notes",
    });
  
  expect(res.status).toBe(201);
  testBookingId = res.body.data.booking.id;

  // Create a past booking for logging tests
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

  // Manually log creation activities for past booking to simulate standard flow
  await prisma.bookingActivity.createMany({
    data: [
      {
        bookingId: pastBookingId,
        activityType: "BOOKING_CREATED",
        actorType: "STUDENT",
        actorName: "John Past",
        timestamp: pastBooking.createdAt,
      },
      {
        bookingId: pastBookingId,
        activityType: "BOOKING_CONFIRMED",
        actorType: "SYSTEM",
        actorName: "System",
        timestamp: pastBooking.createdAt,
      },
    ],
  });
});

afterAll(clearTables);

describe("Booking Activity Timeline API", () => {
  describe("GET /api/bookings/:bookingId/timeline", () => {
    it("returns activity timeline successfully for authorized coach", async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/timeline`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.activities).toBeInstanceOf(Array);
      expect(res.body.data.activities.length).toBe(2); // BOOKING_CREATED and BOOKING_CONFIRMED

      const types = res.body.data.activities.map((a: any) => a.activityType);
      expect(types).toContain("BOOKING_CREATED");
      expect(types).toContain("BOOKING_CONFIRMED");
    });

    it("rejects 403 for unauthorized coaches", async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/timeline`)
        .set("Authorization", `Bearer ${otherCoachToken}`);

      expect(res.status).toBe(403);
    });

    it("allows team admin and super admin to access timeline", async () => {
      const adminRes = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/timeline`)
        .set("Authorization", `Bearer ${teamAdminToken}`);
      expect(adminRes.status).toBe(200);

      const superRes = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/timeline`)
        .set("Authorization", `Bearer ${superAdminToken}`);
      expect(superRes.status).toBe(200);
    });

    it("paginates activity timeline results correctly", async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/timeline?page=1&limit=1`)
        .set("Authorization", `Bearer ${coachToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.activities.length).toBe(1);
      expect(res.body.data.pagination).toEqual({
        total: 2,
        page: 1,
        pageSize: 1,
        totalPages: 2,
      });
    });
  });

  describe("Logging activities on actions", () => {
    it("writes BOOKING_RESCHEDULED activity on reschedule", async () => {
      const newStart = new Date(Date.now() + 48 * 3600 * 1000);
      const res = await request(app)
        .post(`/api/bookings/${testBookingId}/reschedule`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          startTime: newStart.toISOString(),
          timezone: "UTC",
        });

      expect(res.status).toBe(200);

      // Verify activity recorded
      const activitiesRes = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/timeline`)
        .set("Authorization", `Bearer ${coachToken}`);

      const rescheduleActivity = activitiesRes.body.data.activities.find(
        (a: any) => a.activityType === "BOOKING_RESCHEDULED"
      );

      expect(rescheduleActivity).toBeDefined();
      expect(rescheduleActivity.actorType).toBe("COACH");
      expect(rescheduleActivity.actorName).toBe("Casey Coach");
      expect(rescheduleActivity.metadata.newSlot).toBeDefined();
    });

    it("writes SESSION_LOGGED, ATTENDANCE_UPDATED, and SESSION_COMPLETED when logging past session", async () => {
      const res = await request(app)
        .post(`/api/bookings/${pastBookingId}/log`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          topicsDiscussed: "Testing timeline integration",
          summary: "Logging sessions works perfectly.",
          attended: true,
        });

      expect(res.status).toBe(200);

      const timelineRes = await request(app)
        .get(`/api/v1/bookings/${pastBookingId}/timeline`)
        .set("Authorization", `Bearer ${coachToken}`);

      const types = timelineRes.body.data.activities.map((a: any) => a.activityType);
      expect(types).toContain("SESSION_LOGGED");
      expect(types).toContain("ATTENDANCE_UPDATED");
      expect(types).toContain("SESSION_COMPLETED");
    });

    it("writes BOOKING_CANCELLED activity on cancellation", async () => {
      const res = await request(app)
        .post(`/api/bookings/${testBookingId}/cancel`)
        .set("Authorization", `Bearer ${coachToken}`)
        .send({
          cancellationReason: "Student requested cancellation",
        });

      expect(res.status).toBe(200);

      const timelineRes = await request(app)
        .get(`/api/v1/bookings/${testBookingId}/timeline`)
        .set("Authorization", `Bearer ${coachToken}`);

      const cancelActivity = timelineRes.body.data.activities.find(
        (a: any) => a.activityType === "BOOKING_CANCELLED"
      );

      expect(cancelActivity).toBeDefined();
      expect(cancelActivity.actorType).toBe("COACH");
      expect(cancelActivity.actorName).toBe("Casey Coach");
      expect(cancelActivity.metadata.cancellationReason).toBe("Student requested cancellation");
    });
  });
});

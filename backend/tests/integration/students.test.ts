import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";
import { AssignmentStrategy, EventLocationType } from "@prisma/client";

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

let adminToken: string;
let coachToken: string;
let teamId: string;
let eventId: string;
let coachId: string;
let studentId: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("students-admin@test.com", "Admin1234");
  adminToken = admin.token;

  const coach = await registerUser(adminToken, {
    firstName: "Student",
    lastName: "Coach",
    email: "students-coach@test.com",
    password: "Coach1234",
    role: "COACH",
  });
  coachId = coach.id;
  coachToken = coach.token;

  const team = await prisma.team.create({
    data: {
      name: "Students Team",
      createdById: admin.id,
      teamLeadId: admin.id,
      publicBookingSlug: "students-team-test",
      members: {
        create: {
          userId: coachId,
          isActive: true,
        },
      },
    },
  });
  teamId = team.id;

  const offering = await prisma.eventOffering.create({
    data: {
      key: "students-offering",
      name: "Students Offering",
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const event = await prisma.event.create({
    data: {
      name: "Student History Session",
      teamId,
      offeringId: offering.id,
      interactionType: "ONE_TO_ONE",
      assignmentStrategy: AssignmentStrategy.DIRECT,
      durationSeconds: 3600,
      locationType: EventLocationType.VIRTUAL,
      locationValue: "Zoom",
      createdById: coachId,
      updatedById: coachId,
      publicBookingSlug: "student-history-session-test",
      coaches: {
        create: {
          coachUserId: coachId,
          coachOrder: 1,
        },
      },
    },
  });
  eventId = event.id;

  await prisma.userWeeklyAvailability.create({
    data: {
      userId: coachId,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
    },
  });

  const firstStart = getNextUtcWeekdayAt(1, 10, 0).toISOString();
  const secondStart = getNextUtcWeekdayAt(1, 12, 0).toISOString();

  const firstBookingRes = await request(app).post("/api/bookings").send({
    studentName: "History Student",
    studentEmail: "history.student@example.com",
    teamId,
    eventId,
    startTime: firstStart,
    timezone: "UTC",
  });

  const secondBookingRes = await request(app).post("/api/bookings").send({
    studentName: "History Student",
    studentEmail: "history.student@example.com",
    teamId,
    eventId,
    startTime: secondStart,
    timezone: "UTC",
  });

  studentId =
    secondBookingRes.body.data.booking.student?.id ?? firstBookingRes.body.data.booking.student?.id;
});

afterAll(async () => {
  await clearTables();
});

describe("Students API", () => {
  it("lists students with booking summary data", async () => {
    const res = await request(app)
      .get("/api/students")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.students.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.students[0].email).toBe("history.student@example.com");
    expect(res.body.data.students[0].bookingCount).toBeGreaterThanOrEqual(2);
    expect(res.body.data.students[0].latestBooking).toBeDefined();
  });

  it("returns a student detail profile with latest booking info", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.student.id).toBe(studentId);
    expect(res.body.data.student.email).toBe("history.student@example.com");
    expect(res.body.data.student.latestBooking).toBeDefined();
    expect(res.body.data.student.latestBooking.team.name).toBe("Students Team");
  });

  it("returns the student's complete booking history", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}/bookings`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.bookings[0].student.id).toBe(studentId);
  });
});

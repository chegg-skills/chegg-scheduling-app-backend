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

let studentId: string;
let emptyStudentId: string;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@test.com", "Admin1234");
  superAdminToken = admin.token;
  superAdminId = admin.id;

  const teamAdmin = await registerUser(superAdminToken, {
    firstName: "Lead",
    lastName: "Admin",
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
      name: "Team A",
      teamLeadId: teamAdminId,
      createdById: superAdminId,
      isActive: true,
      publicBookingSlug: "team-a",
    },
  });

  const eventType = await prisma.eventType.create({
    data: {
      key: "stud_type",
      name: "Stud Type",
      isActive: true,
      createdById: superAdminId,
      updatedById: superAdminId,
    },
  });

  const oneOnOneEvent = await prisma.event.create({
    data: {
      name: "1:1 Help",
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
      publicBookingSlug: "one-help",
    },
  });

  const groupEvent = await prisma.event.create({
    data: {
      name: "Group Help",
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
      publicBookingSlug: "group-help",
    },
  });

  const student = await prisma.student.create({
    data: {
      fullName: "Alice Student",
      email: "alice@student.com",
    },
  });
  studentId = student.id;

  const emptyStudent = await prisma.student.create({
    data: {
      fullName: "Empty Student",
      email: "empty@student.com",
    },
  });
  emptyStudentId = emptyStudent.id;

  const pastStart = new Date(Date.now() - 10 * 3600 * 1000);
  const pastEnd = new Date(Date.now() - 9 * 3600 * 1000);

  // 1:1 booking with a direct sessionLog
  const oneBooking = await prisma.booking.create({
    data: {
      studentId: student.id,
      studentName: student.fullName,
      studentEmail: student.email,
      teamId: team.id,
      eventId: oneOnOneEvent.id,
      coachUserId: coachId,
      startTime: pastStart,
      endTime: pastEnd,
      status: "COMPLETED",
    },
  });

  await prisma.sessionLog.create({
    data: {
      bookingId: oneBooking.id,
      loggedByUserId: coachId,
      topicsDiscussed: "1:1 topic",
      summary: "1:1 summary",
      coachNotes: "Private 1:1 note",
    },
  });

  await prisma.sessionAttendance.create({
    data: {
      bookingId: oneBooking.id,
      sessionLogId: (await prisma.sessionLog.findUnique({
        where: { bookingId: oneBooking.id },
      }))!.id,
      attended: true,
    },
  });

  // Group booking via slot with a slot-level sessionLog
  const slot = await prisma.eventScheduleSlot.create({
    data: {
      eventId: groupEvent.id,
      startTime: new Date(Date.now() - 5 * 3600 * 1000),
      endTime: new Date(Date.now() - 4 * 3600 * 1000),
      assignedCoachId: coachId,
      isActive: true,
    },
  });

  const groupBooking = await prisma.booking.create({
    data: {
      studentId: student.id,
      studentName: student.fullName,
      studentEmail: student.email,
      teamId: team.id,
      eventId: groupEvent.id,
      coachUserId: coachId,
      scheduleSlotId: slot.id,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: "COMPLETED",
    },
  });

  const slotLog = await prisma.sessionLog.create({
    data: {
      scheduleSlotId: slot.id,
      loggedByUserId: coachId,
      topicsDiscussed: "Group topic",
      summary: "Group summary",
      coachNotes: "Private group note",
    },
  });

  await prisma.sessionAttendance.create({
    data: {
      bookingId: groupBooking.id,
      sessionLogId: slotLog.id,
      attended: false,
    },
  });
});

afterAll(clearTables);

describe("GET /api/students/:studentId/session-logs", () => {
  it("returns both 1:1 and group logs for the student, newest first", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}/session-logs`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.sessionLogs)).toBe(true);
    expect(res.body.data.sessionLogs).toHaveLength(2);

    const types = res.body.data.sessionLogs.map((e: any) => e.isGroupSession);
    expect(types).toContain(true);
    expect(types).toContain(false);
  });

  it("returns empty array when student has no logs", async () => {
    const res = await request(app)
      .get(`/api/students/${emptyStudentId}/session-logs`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessionLogs).toEqual([]);
  });

  it("redacts coachNotes for COACH role", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}/session-logs`)
      .set("Authorization", `Bearer ${coachToken}`);

    expect(res.status).toBe(200);
    for (const entry of res.body.data.sessionLogs) {
      expect(entry.coachNotes).toBeNull();
    }
  });

  it("returns coachNotes for TEAM_ADMIN role", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}/session-logs`)
      .set("Authorization", `Bearer ${teamAdminToken}`);

    expect(res.status).toBe(200);
    const hasPrivate = res.body.data.sessionLogs.some(
      (e: any) => typeof e.coachNotes === "string" && e.coachNotes.length > 0,
    );
    expect(hasPrivate).toBe(true);
  });

  it("returns 404 for unauthorized coach without access to student bookings", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}/session-logs`)
      .set("Authorization", `Bearer ${otherCoachToken}`);

    expect(res.status).toBe(404);
  });

  it("returns attendance per booking (true for 1:1, false for group via slot)", async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}/session-logs`)
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const oneOnOne = res.body.data.sessionLogs.find((e: any) => !e.isGroupSession);
    const group = res.body.data.sessionLogs.find((e: any) => e.isGroupSession);
    expect(oneOnOne.attended).toBe(true);
    expect(group.attended).toBe(false);
  });
});

import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

/**
 * Regression coverage for the reports domain, focused on cross-team data isolation:
 * a TEAM_ADMIN must only ever see coaches/students/bookings for the team(s) they lead.
 * Two teams (led by leadA / leadB) each with their own coach, student, and completed
 * booking; assertions verify leadA never sees team-B coaches/students/bookings.
 */

let superAdminToken: string;
let leadAToken: string;
let leadBToken: string;
let coachToken: string;

const coachAEmail = "coach-a@reports.com";
const coachBEmail = "coach-b@reports.com";
const studentAEmail = "student-a@reports.com";
const studentBEmail = "student-b@reports.com";

const q = "?format=json&timeframe=all";

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@reports.com", "Admin1234");
  superAdminToken = admin.token;

  const leadA = await registerUser(superAdminToken, {
    firstName: "Lead",
    lastName: "A",
    email: "lead-a@reports.com",
    password: "LeadPass1234",
    role: "TEAM_ADMIN",
  });
  leadAToken = leadA.token;

  const leadB = await registerUser(superAdminToken, {
    firstName: "Lead",
    lastName: "B",
    email: "lead-b@reports.com",
    password: "LeadPass1234",
    role: "TEAM_ADMIN",
  });
  leadBToken = leadB.token;

  const coachA = await registerUser(superAdminToken, {
    firstName: "Coach",
    lastName: "A",
    email: coachAEmail,
    password: "CoachPass1234",
    role: "COACH",
  });
  const coachB = await registerUser(superAdminToken, {
    firstName: "Coach",
    lastName: "B",
    email: coachBEmail,
    password: "CoachPass1234",
    role: "COACH",
  });
  const coachOnly = await registerUser(superAdminToken, {
    firstName: "Coach",
    lastName: "Only",
    email: "coach-only@reports.com",
    password: "CoachPass1234",
    role: "COACH",
  });
  coachToken = coachOnly.token;

  const teamA = await prisma.team.create({
    data: {
      name: "reports_team_a",
      teamLeadId: leadA.id,
      createdById: admin.id,
      isActive: true,
      publicBookingSlug: "reports-team-a",
    },
  });
  const teamB = await prisma.team.create({
    data: {
      name: "reports_team_b",
      teamLeadId: leadB.id,
      createdById: admin.id,
      isActive: true,
      publicBookingSlug: "reports-team-b",
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: teamA.id, userId: coachA.id, isActive: true },
      { teamId: teamB.id, userId: coachB.id, isActive: true },
    ],
  });

  const offering = await prisma.eventType.create({
    data: {
      key: "reports_offering",
      name: "Reports Offering",
      isActive: true,
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  const eventA = await prisma.event.create({
    data: {
      name: "Reports Event A",
      teamId: teamA.id,
      eventTypeId: offering.id,
      interactionType: "ONE_TO_ONE",
      assignmentStrategy: "DIRECT",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/a",
      isActive: true,
      createdById: admin.id,
      updatedById: admin.id,
      publicBookingSlug: "reports-event-a",
    },
  });
  const eventB = await prisma.event.create({
    data: {
      name: "Reports Event B",
      teamId: teamB.id,
      eventTypeId: offering.id,
      interactionType: "ONE_TO_ONE",
      assignmentStrategy: "DIRECT",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://example.com/b",
      isActive: true,
      createdById: admin.id,
      updatedById: admin.id,
      publicBookingSlug: "reports-event-b",
    },
  });

  const studentA = await prisma.student.create({
    data: { fullName: "Student A", email: studentAEmail, lastBookedAt: new Date() },
  });
  const studentB = await prisma.student.create({
    data: { fullName: "Student B", email: studentBEmail, lastBookedAt: new Date() },
  });

  const start = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  await prisma.booking.createMany({
    data: [
      {
        studentId: studentA.id,
        studentName: "Student A",
        studentEmail: studentAEmail,
        teamId: teamA.id,
        eventId: eventA.id,
        coachUserId: coachA.id,
        startTime: start,
        endTime: end,
        timezone: "UTC",
        status: "COMPLETED",
      },
      {
        studentId: studentB.id,
        studentName: "Student B",
        studentEmail: studentBEmail,
        teamId: teamB.id,
        eventId: eventB.id,
        coachUserId: coachB.id,
        startTime: start,
        endTime: end,
        timezone: "UTC",
        status: "COMPLETED",
      },
    ],
  });
});

afterAll(clearTables);

const json = (token: string, path: string) =>
  request(app).get(path).set("Authorization", `Bearer ${token}`);

describe("GET /api/v1/reports/performance", () => {
  it("scopes a TEAM_ADMIN to coaches on their own team only", async () => {
    const res = await json(leadAToken, `/api/v1/reports/performance${q}`);
    expect(res.status).toBe(200);
    const emails = res.body.data.map((r: any) => r.Email);
    expect(emails).toContain(coachAEmail);
    expect(emails).not.toContain(coachBEmail); // the leak: must NOT see the other team's coach
  });

  it("gives SUPER_ADMIN the org-wide coach roster", async () => {
    const res = await json(superAdminToken, `/api/v1/reports/performance${q}`);
    expect(res.status).toBe(200);
    const emails = res.body.data.map((r: any) => r.Email);
    expect(emails).toEqual(expect.arrayContaining([coachAEmail, coachBEmail]));
  });

  it("counts only the calling team's sessions for that team's coach", async () => {
    const res = await json(leadAToken, `/api/v1/reports/performance${q}`);
    const coachARow = res.body.data.find((r: any) => r.Email === coachAEmail);
    expect(coachARow).toMatchObject({ "Total Sessions": 1, Completed: 1 });
  });
});

describe("GET /api/v1/reports/students", () => {
  it("scopes a TEAM_ADMIN to students who booked on their own team only", async () => {
    const res = await json(leadAToken, `/api/v1/reports/students${q}`);
    expect(res.status).toBe(200);
    const emails = res.body.data.map((r: any) => r.Email);
    expect(emails).toContain(studentAEmail);
    expect(emails).not.toContain(studentBEmail); // the PII leak: other team's students hidden
  });

  it("gives SUPER_ADMIN every student", async () => {
    const res = await json(superAdminToken, `/api/v1/reports/students${q}`);
    expect(res.status).toBe(200);
    const emails = res.body.data.map((r: any) => r.Email);
    expect(emails).toEqual(expect.arrayContaining([studentAEmail, studentBEmail]));
  });
});

describe("GET /api/v1/reports/bookings", () => {
  it("scopes a TEAM_ADMIN to their own team's bookings", async () => {
    const res = await json(leadAToken, `/api/v1/reports/bookings${q}`);
    expect(res.status).toBe(200);
    const studentEmails = res.body.data.map((r: any) => r["Student Email"]);
    expect(studentEmails).toContain(studentAEmail);
    expect(studentEmails).not.toContain(studentBEmail);
  });

  it("gives SUPER_ADMIN every booking", async () => {
    const res = await json(superAdminToken, `/api/v1/reports/bookings${q}`);
    expect(res.status).toBe(200);
    const studentEmails = res.body.data.map((r: any) => r["Student Email"]);
    expect(studentEmails).toEqual(expect.arrayContaining([studentAEmail, studentBEmail]));
  });
});

describe("reports authorization", () => {
  it.each([
    ["/api/v1/reports/performance"],
    ["/api/v1/reports/students"],
    ["/api/v1/reports/bookings"],
  ])("rejects a COACH with 403: %s", async (path) => {
    const res = await json(coachToken, `${path}${q}`);
    expect(res.status).toBe(403);
  });

  it.each([
    ["/api/v1/reports/performance"],
    ["/api/v1/reports/students"],
    ["/api/v1/reports/bookings"],
  ])("rejects an unauthenticated request with 401: %s", async (path) => {
    const res = await request(app).get(`${path}${q}`);
    expect(res.status).toBe(401);
  });
});

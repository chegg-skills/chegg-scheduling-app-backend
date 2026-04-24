import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser, type TestUser } from "../helpers/auth";

type TestContext = {
  superAdmin: TestUser;
  teamAdmin: TestUser;
  coachOne: TestUser;
  coachTwo: TestUser;
  coachThree: TestUser;
  teamId: string;
  eventId: string;
};

let context: TestContext;

// A slot one week from now to avoid past-slot issues
const futureSlotStart = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

const createBooking = async (
  eventId: string,
  teamId: string,
  slotId: string,
  slotStart: Date,
  slotEnd: Date,
  coachUserId: string,
  opts: { status?: string; coCoachUserIds?: string[] } = {},
) => {
  return prisma.booking.create({
    data: {
      studentName: "Test Student",
      studentEmail: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.com`,
      teamId,
      eventId,
      startTime: slotStart,
      endTime: slotEnd,
      coachUserId,
      scheduleSlotId: slotId,
      status: (opts.status as any) ?? "CONFIRMED",
      coCoachUserIds: opts.coCoachUserIds ?? [],
    },
  });
};

beforeAll(async () => {
  await clearTables();

  const superAdmin = await bootstrapAdmin("super@session-log.com", "Admin1234");
  const teamAdmin = await registerUser(superAdmin.token, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@session-log.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });
  const coachOne = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "One",
    email: "coach1@session-log.com",
    password: "Coach1234",
    role: "COACH",
  });
  const coachTwo = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "Two",
    email: "coach2@session-log.com",
    password: "Coach1234",
    role: "COACH",
  });
  const coachThree = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "Three",
    email: "coach3@session-log.com",
    password: "Coach1234",
    role: "COACH",
  });

  const team = await prisma.team.create({
    data: {
      name: "Session Log Team",
      createdById: superAdmin.id,
      teamLeadId: teamAdmin.id,
      publicBookingSlug: "session-log-team",
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: team.id, userId: coachOne.id },
      { teamId: team.id, userId: coachTwo.id },
    ],
  });

  const offering = await prisma.eventOffering.create({
    data: {
      key: "session_log_offering",
      name: "Session Log Offering",
      createdById: superAdmin.id,
      updatedById: superAdmin.id,
    },
  });

  const event = await prisma.event.create({
    data: {
      name: "Session Log Test Event",
      teamId: team.id,
      offeringId: offering.id,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      durationSeconds: 3600,
      locationType: "VIRTUAL",
      locationValue: "https://zoom.example.com",
      createdById: superAdmin.id,
      updatedById: superAdmin.id,
      publicBookingSlug: "session-log-test-event",
      allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    },
  });

  // Assign coachOne to the event
  await request(app)
    .put(`/api/events/${event.id}/coaches`)
    .set("Authorization", `Bearer ${teamAdmin.token}`)
    .send({ coaches: [{ userId: coachOne.id, coachOrder: 1 }] });

  context = {
    superAdmin,
    teamAdmin,
    coachOne,
    coachTwo,
    coachThree,
    teamId: team.id,
    eventId: event.id,
  };
});

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// POST /api/events/:eventId/schedule-slots/:slotId/log
// ─────────────────────────────────────────────────────────────

describe("POST /api/events/:eventId/schedule-slots/:slotId/log — authorization", () => {
  let slotId: string;
  let slotStart: Date;
  let slotEnd: Date;
  let bookingId: string;

  beforeEach(async () => {
    slotStart = futureSlotStart();
    slotEnd = new Date(slotStart.getTime() + 3600 * 1000);
    const slot = await prisma.eventScheduleSlot.create({
      data: {
        eventId: context.eventId,
        startTime: slotStart,
        endTime: slotEnd,
        capacity: 5,
        assignedCoachId: context.coachOne.id,
      },
    });
    slotId = slot.id;

    const booking = await createBooking(
      context.eventId,
      context.teamId,
      slotId,
      slotStart,
      slotEnd,
      context.coachOne.id,
    );
    bookingId = booking.id;
  });

  afterEach(async () => {
    await prisma.sessionLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.eventScheduleSlot.deleteMany();
  });

  it("TEAM_ADMIN can create a session log", async () => {
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({
        topicsDiscussed: "Arrays and sorting",
        summary: "Covered merge sort in detail",
        coachNotes: "Student needs more recursion practice",
        attendance: [{ bookingId, attended: true }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.topicsDiscussed).toBe("Arrays and sorting");
    expect(res.body.data.summary).toBe("Covered merge sort in detail");
    expect(res.body.data.loggedBy.id).toBe(context.teamAdmin.id);
  });

  it("SUPER_ADMIN can create a session log", async () => {
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.superAdmin.token}`)
      .send({ attendance: [{ bookingId, attended: true }] });

    expect(res.status).toBe(200);
    expect(res.body.data.loggedBy.id).toBe(context.superAdmin.id);
  });

  it("assigned COACH (coachOne) can create a session log for their slot", async () => {
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.coachOne.token}`)
      .send({ attendance: [{ bookingId, attended: true }] });

    expect(res.status).toBe(200);
  });

  it("co-coach in booking.coCoachUserIds can create a session log", async () => {
    // Create a booking where coachTwo is a co-coach
    const coCoachBooking = await createBooking(
      context.eventId,
      context.teamId,
      slotId,
      slotStart,
      slotEnd,
      context.coachOne.id,
      { coCoachUserIds: [context.coachTwo.id] },
    );

    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.coachTwo.token}`)
      .send({
        attendance: [
          { bookingId, attended: true },
          { bookingId: coCoachBooking.id, attended: true },
        ],
      });

    expect(res.status).toBe(200);
  });

  it("unrelated COACH (not assigned, not co-coach) is forbidden", async () => {
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.coachThree.token}`)
      .send({ attendance: [{ bookingId, attended: true }] });

    expect(res.status).toBe(403);
  });

  it("returns 401 when no auth token is provided", async () => {
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .send({ attendance: [{ bookingId, attended: true }] });

    expect(res.status).toBe(401);
  });
});

describe("POST /api/events/:eventId/schedule-slots/:slotId/log — business logic", () => {
  let slotId: string;
  let slotStart: Date;
  let slotEnd: Date;
  let bookingOneId: string;
  let bookingTwoId: string;

  beforeEach(async () => {
    slotStart = futureSlotStart();
    slotEnd = new Date(slotStart.getTime() + 3600 * 1000);
    const slot = await prisma.eventScheduleSlot.create({
      data: {
        eventId: context.eventId,
        startTime: slotStart,
        endTime: slotEnd,
        capacity: 5,
        assignedCoachId: context.coachOne.id,
      },
    });
    slotId = slot.id;

    const b1 = await createBooking(
      context.eventId,
      context.teamId,
      slotId,
      slotStart,
      slotEnd,
      context.coachOne.id,
    );
    const b2 = await createBooking(
      context.eventId,
      context.teamId,
      slotId,
      slotStart,
      slotEnd,
      context.coachOne.id,
    );
    bookingOneId = b1.id;
    bookingTwoId = b2.id;
  });

  afterEach(async () => {
    await prisma.sessionLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.eventScheduleSlot.deleteMany();
  });

  it("attended: true transitions booking status to COMPLETED", async () => {
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ attendance: [{ bookingId: bookingOneId, attended: true }] });

    expect(res.status).toBe(200);

    const booking = await prisma.booking.findUnique({ where: { id: bookingOneId } });
    expect(booking?.status).toBe("COMPLETED");
  });

  it("attended: false transitions booking status to NO_SHOW", async () => {
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ attendance: [{ bookingId: bookingOneId, attended: false }] });

    expect(res.status).toBe(200);

    const booking = await prisma.booking.findUnique({ where: { id: bookingOneId } });
    expect(booking?.status).toBe("NO_SHOW");
  });

  it("CANCELLED booking status is not changed", async () => {
    await prisma.booking.update({
      where: { id: bookingOneId },
      data: { status: "CANCELLED" },
    });

    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ attendance: [{ bookingId: bookingOneId, attended: true }] });

    expect(res.status).toBe(200);

    const booking = await prisma.booking.findUnique({ where: { id: bookingOneId } });
    expect(booking?.status).toBe("CANCELLED");
  });

  it("PENDING booking status is not changed", async () => {
    await prisma.booking.update({
      where: { id: bookingOneId },
      data: { status: "PENDING" },
    });

    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ attendance: [{ bookingId: bookingOneId, attended: false }] });

    expect(res.status).toBe(200);

    const booking = await prisma.booking.findUnique({ where: { id: bookingOneId } });
    expect(booking?.status).toBe("PENDING");
  });

  it("re-POSTing (upsert) updates the existing log fields and attendance", async () => {
    await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({
        topicsDiscussed: "Initial topic",
        attendance: [{ bookingId: bookingOneId, attended: true }],
      });

    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({
        topicsDiscussed: "Updated topic",
        summary: "Updated summary",
        attendance: [{ bookingId: bookingOneId, attended: false }],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.topicsDiscussed).toBe("Updated topic");
    expect(res.body.data.summary).toBe("Updated summary");

    const booking = await prisma.booking.findUnique({ where: { id: bookingOneId } });
    expect(booking?.status).toBe("NO_SHOW");
  });

  it("returns 400 when attendance contains a bookingId not belonging to this slot", async () => {
    // Create a booking linked to a different slot
    const otherSlotStart = new Date(slotStart.getTime() + 2 * 24 * 60 * 60 * 1000);
    const otherSlotEnd = new Date(otherSlotStart.getTime() + 3600 * 1000);
    const otherSlot = await prisma.eventScheduleSlot.create({
      data: {
        eventId: context.eventId,
        startTime: otherSlotStart,
        endTime: otherSlotEnd,
        capacity: 1,
      },
    });
    const foreignBooking = await createBooking(
      context.eventId,
      context.teamId,
      otherSlot.id,
      otherSlotStart,
      otherSlotEnd,
      context.coachOne.id,
    );

    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ attendance: [{ bookingId: foreignBooking.id, attended: true }] });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/do not belong to this slot/i);
  });

  it("returns 404 when slotId does not exist", async () => {
    const nonExistentId = "00000000-0000-0000-0000-000000000000";
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${nonExistentId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ attendance: [] });

    expect(res.status).toBe(404);
  });

  it("returns 404 when slotId belongs to a different event", async () => {
    // Create a second event and slot
    const offering = await prisma.eventOffering.create({
      data: {
        key: "other_log_offering",
        name: "Other Log Offering",
        createdById: context.superAdmin.id,
        updatedById: context.superAdmin.id,
      },
    });
    const otherEvent = await prisma.event.create({
      data: {
        name: "Other Log Event",
        teamId: context.teamId,
        offeringId: offering.id,
        interactionType: "ONE_TO_MANY",
        assignmentStrategy: "DIRECT",
        bookingMode: "FIXED_SLOTS",
        durationSeconds: 3600,
        locationType: "VIRTUAL",
        locationValue: "https://zoom.example.com",
        createdById: context.superAdmin.id,
        updatedById: context.superAdmin.id,
        publicBookingSlug: "other-log-event",
        allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      },
    });
    const otherSlotStart = new Date(slotStart.getTime() + 3 * 24 * 60 * 60 * 1000);
    const otherSlot = await prisma.eventScheduleSlot.create({
      data: {
        eventId: otherEvent.id,
        startTime: otherSlotStart,
        endTime: new Date(otherSlotStart.getTime() + 3600 * 1000),
        capacity: 1,
      },
    });

    // Use the other event's slot on the first event's route
    const res = await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${otherSlot.id}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ attendance: [] });

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/events/:eventId/schedule-slots/:slotId/log
// ─────────────────────────────────────────────────────────────

describe("GET /api/events/:eventId/schedule-slots/:slotId/log", () => {
  let slotId: string;
  let slotStart: Date;
  let slotEnd: Date;
  let bookingId: string;

  beforeAll(async () => {
    slotStart = futureSlotStart();
    slotEnd = new Date(slotStart.getTime() + 3600 * 1000);
    const slot = await prisma.eventScheduleSlot.create({
      data: {
        eventId: context.eventId,
        startTime: new Date(slotStart.getTime() + 14 * 24 * 60 * 60 * 1000),
        endTime: new Date(slotEnd.getTime() + 14 * 24 * 60 * 60 * 1000),
        capacity: 5,
        assignedCoachId: context.coachOne.id,
      },
    });
    slotId = slot.id;

    const booking = await createBooking(
      context.eventId,
      context.teamId,
      slotId,
      slot.startTime,
      slot.endTime,
      context.coachOne.id,
    );
    bookingId = booking.id;
  });

  afterAll(async () => {
    await prisma.sessionLog.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.eventScheduleSlot.deleteMany();
  });

  it("returns null when no session log has been created for the slot", async () => {
    const res = await request(app)
      .get(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it("returns the saved log with attendance and loggedBy after POST", async () => {
    // Create the log first
    await request(app)
      .post(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({
        topicsDiscussed: "GET test topic",
        coachNotes: "Private note",
        attendance: [{ bookingId, attended: true }],
      });

    const res = await request(app)
      .get(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.topicsDiscussed).toBe("GET test topic");
    expect(res.body.data.coachNotes).toBe("Private note");
    expect(Array.isArray(res.body.data.attendance)).toBe(true);
    expect(res.body.data.attendance).toHaveLength(1);
    expect(res.body.data.loggedBy.id).toBe(context.teamAdmin.id);
    expect(typeof res.body.data.loggedBy.firstName).toBe("string");
  });

  it("assigned COACH can GET the session log for their slot", async () => {
    const res = await request(app)
      .get(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.coachOne.token}`);

    expect(res.status).toBe(200);
  });

  it("unrelated COACH cannot GET the session log", async () => {
    const res = await request(app)
      .get(`/api/events/${context.eventId}/schedule-slots/${slotId}/log`)
      .set("Authorization", `Bearer ${context.coachThree.token}`);

    expect(res.status).toBe(403);
  });
});

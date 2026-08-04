import { Prisma } from "@prisma/client";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

// Relative dates keep the suite from becoming a time-bomb. The tracker service
// does its date math in the server's LOCAL timezone (getFullYear/getMonth/getDate
// and `new Date("YYYY-MM-DDT..")` with no Z), so mirror that here.
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// A single future day, at 10:00 local, holding all seeded slots.
const slotStart = (() => {
  const d = addDays(new Date(), 30);
  d.setHours(10, 0, 0, 0);
  return d;
})();
const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
const SLOT_DATE = toLocalDate(slotStart);

let superAdminToken: string;
let teamAAdminToken: string;
let teamBAdminToken: string;
let coachToken: string;
let teamAId: string;
let teamBId: string;
let eventAId: string;
let eventBId: string;
let oneToOneEventId: string;

const baseEvent = (
  over: Partial<Prisma.EventUncheckedCreateInput>,
): Prisma.EventUncheckedCreateInput =>
  ({
    assignmentStrategy: "DIRECT",
    bookingMode: "FIXED_SLOTS",
    durationSeconds: 3600,
    locationType: "VIRTUAL",
    locationValue: "https://meet.example.com",
    meetingLinkSource: "COACH_ISV",
    maxParticipantCount: 10,
    ...over,
  }) as Prisma.EventUncheckedCreateInput;

beforeAll(async () => {
  await clearTables();

  const admin = await bootstrapAdmin("super@tracker.com", "Admin1234");
  superAdminToken = admin.token;

  const teamAAdmin = await registerUser(superAdminToken, {
    firstName: "TeamA", lastName: "Admin", email: "a-admin@tracker.com", password: "AdminA1234", role: "TEAM_ADMIN",
  });
  teamAAdminToken = teamAAdmin.token;

  const teamBAdmin = await registerUser(superAdminToken, {
    firstName: "TeamB", lastName: "Admin", email: "b-admin@tracker.com", password: "AdminB1234", role: "TEAM_ADMIN",
  });
  teamBAdminToken = teamBAdmin.token;

  const coach = await registerUser(superAdminToken, {
    firstName: "A", lastName: "Coach", email: "coach@tracker.com", password: "Coach1234", role: "COACH",
  });
  coachToken = coach.token;

  const teamA = await prisma.team.create({
    data: { name: "Team A", teamLeadId: teamAAdmin.id, createdById: admin.id, isActive: true, publicBookingSlug: "tracker-team-a" },
  });
  teamAId = teamA.id;
  const teamB = await prisma.team.create({
    data: { name: "Team B", teamLeadId: teamBAdmin.id, createdById: admin.id, isActive: true, publicBookingSlug: "tracker-team-b" },
  });
  teamBId = teamB.id;

  const eventType = await prisma.eventType.create({
    data: { key: "tracker_type", name: "Tracker Type", isActive: true, createdById: admin.id, updatedById: admin.id },
  });

  const eventA = await prisma.event.create({
    data: baseEvent({
      name: "Group Session A", teamId: teamAId, eventTypeId: eventType.id, interactionType: "ONE_TO_MANY",
      createdById: admin.id, updatedById: admin.id, publicBookingSlug: "tracker-event-a",
    }),
  });
  eventAId = eventA.id;

  const eventB = await prisma.event.create({
    data: baseEvent({
      name: "Group Session B", teamId: teamBId, eventTypeId: eventType.id, interactionType: "ONE_TO_MANY",
      createdById: admin.id, updatedById: admin.id, publicBookingSlug: "tracker-event-b",
    }),
  });
  eventBId = eventB.id;

  // A ONE_TO_ONE event on team A — must never appear in the tracker.
  const oneToOne = await prisma.event.create({
    data: baseEvent({
      name: "Private 1:1", teamId: teamAId, eventTypeId: eventType.id, interactionType: "ONE_TO_ONE",
      maxParticipantCount: 1, createdById: admin.id, updatedById: admin.id, publicBookingSlug: "tracker-event-1to1",
    }),
  });
  oneToOneEventId = oneToOne.id;

  await prisma.eventScheduleSlot.createMany({
    data: [
      { eventId: eventAId, startTime: slotStart, endTime: slotEnd },
      { eventId: eventBId, startTime: slotStart, endTime: slotEnd },
      { eventId: oneToOneEventId, startTime: slotStart, endTime: slotEnd },
    ],
  });
});

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// GET /api/v1/tracker/filters
// ─────────────────────────────────────────────────────────────
describe("GET /api/v1/tracker/filters", () => {
  it("SUPER_ADMIN sees all teams and only ONE_TO_MANY events", async () => {
    const res = await request(app).get("/api/v1/tracker/filters").set(auth(superAdminToken));

    expect(res.status).toBe(200);
    const teamIds = res.body.data.teams.map((t: { id: string }) => t.id);
    const eventIds = res.body.data.events.map((e: { id: string }) => e.id);
    expect(teamIds).toEqual(expect.arrayContaining([teamAId, teamBId]));
    expect(eventIds).toEqual(expect.arrayContaining([eventAId, eventBId]));
    expect(eventIds).not.toContain(oneToOneEventId); // excluded interaction type
  });

  it("TEAM_ADMIN sees only their own team and its events", async () => {
    const res = await request(app).get("/api/v1/tracker/filters").set(auth(teamAAdminToken));

    expect(res.status).toBe(200);
    const teamIds = res.body.data.teams.map((t: { id: string }) => t.id);
    const eventIds = res.body.data.events.map((e: { id: string }) => e.id);
    expect(teamIds).toEqual([teamAId]);
    expect(eventIds).toContain(eventAId);
    expect(eventIds).not.toContain(eventBId); // other team's event hidden
  });

  it("COACH is forbidden (403)", async () => {
    const res = await request(app).get("/api/v1/tracker/filters").set(auth(coachToken));
    expect(res.status).toBe(403);
  });

  it("unauthenticated is rejected (401)", async () => {
    const res = await request(app).get("/api/v1/tracker/filters");
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/tracker/slots
// ─────────────────────────────────────────────────────────────
describe("GET /api/v1/tracker/slots", () => {
  it("returns ONE_TO_MANY slots for the given date, excluding other interaction types", async () => {
    const res = await request(app)
      .get(`/api/v1/tracker/slots?date=${SLOT_DATE}`)
      .set(auth(superAdminToken));

    expect(res.status).toBe(200);
    const eventIds = res.body.data.map((s: { event: { id: string } }) => s.event.id);
    expect(eventIds).toEqual(expect.arrayContaining([eventAId, eventBId]));
    expect(eventIds).not.toContain(oneToOneEventId);

    const slotA = res.body.data.find((s: { event: { id: string } }) => s.event.id === eventAId);
    expect(slotA).toMatchObject({ status: "OPEN", capacity: 10, remainingSeats: 10, bookingCount: 0, isLogged: false });
  });

  it("filters by teamId", async () => {
    const res = await request(app)
      .get(`/api/v1/tracker/slots?date=${SLOT_DATE}&teamId=${teamAId}`)
      .set(auth(superAdminToken));

    expect(res.status).toBe(200);
    const eventIds = res.body.data.map((s: { event: { id: string } }) => s.event.id);
    expect(eventIds).toEqual([eventAId]);
  });

  it("filters by eventId", async () => {
    const res = await request(app)
      .get(`/api/v1/tracker/slots?date=${SLOT_DATE}&eventId=${eventBId}`)
      .set(auth(superAdminToken));

    expect(res.status).toBe(200);
    const eventIds = res.body.data.map((s: { event: { id: string } }) => s.event.id);
    expect(eventIds).toEqual([eventBId]);
  });

  it("scopes results to a TEAM_ADMIN's own team", async () => {
    const res = await request(app)
      .get(`/api/v1/tracker/slots?date=${SLOT_DATE}`)
      .set(auth(teamAAdminToken));

    expect(res.status).toBe(200);
    const eventIds = res.body.data.map((s: { event: { id: string } }) => s.event.id);
    expect(eventIds).toEqual([eventAId]); // never team B's slot
  });

  it("defaults to today (no seeded slots) and returns an empty list", async () => {
    const res = await request(app).get("/api/v1/tracker/slots").set(auth(superAdminToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("rejects a malformed date with 400", async () => {
    const res = await request(app)
      .get("/api/v1/tracker/slots?date=08-2026-01")
      .set(auth(superAdminToken));
    expect(res.status).toBe(400);
  });

  it("rejects a range that exceeds the 366-day cap with 400", async () => {
    const start = toLocalDate(new Date());
    const end = toLocalDate(addDays(new Date(), 400));
    const res = await request(app)
      .get(`/api/v1/tracker/slots?startDate=${start}&endDate=${end}`)
      .set(auth(superAdminToken));
    expect(res.status).toBe(400);
  });

  it("COACH is forbidden (403)", async () => {
    const res = await request(app).get(`/api/v1/tracker/slots?date=${SLOT_DATE}`).set(auth(coachToken));
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────
// GET /api/v1/tracker/session-dates
// ─────────────────────────────────────────────────────────────
describe("GET /api/v1/tracker/session-dates", () => {
  const range = () => {
    const start = toLocalDate(addDays(new Date(), 1));
    const end = toLocalDate(addDays(new Date(), 60));
    return `startDate=${start}&endDate=${end}`;
  };

  it("returns the distinct local dates that have sessions", async () => {
    const res = await request(app)
      .get(`/api/v1/tracker/session-dates?${range()}`)
      .set(auth(superAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.dates).toContain(SLOT_DATE);
    // Two events share the same day -> deduped to a single entry.
    expect(res.body.data.dates.filter((d: string) => d === SLOT_DATE)).toHaveLength(1);
  });

  it("scopes dates to a TEAM_ADMIN's own team", async () => {
    const res = await request(app)
      .get(`/api/v1/tracker/session-dates?${range()}`)
      .set(auth(teamAAdminToken));

    expect(res.status).toBe(200);
    expect(res.body.data.dates).toContain(SLOT_DATE); // from event A
  });

  it("requires both startDate and endDate (400 when endDate is missing)", async () => {
    const start = toLocalDate(addDays(new Date(), 1));
    const res = await request(app)
      .get(`/api/v1/tracker/session-dates?startDate=${start}`)
      .set(auth(superAdminToken));
    expect(res.status).toBe(400);
  });

  it("rejects a range that exceeds the 366-day cap with 400", async () => {
    const start = toLocalDate(new Date());
    const end = toLocalDate(addDays(new Date(), 400));
    const res = await request(app)
      .get(`/api/v1/tracker/session-dates?startDate=${start}&endDate=${end}`)
      .set(auth(superAdminToken));
    expect(res.status).toBe(400);
  });

  it("COACH is forbidden (403)", async () => {
    const res = await request(app)
      .get(`/api/v1/tracker/session-dates?${range()}`)
      .set(auth(coachToken));
    expect(res.status).toBe(403);
  });
});

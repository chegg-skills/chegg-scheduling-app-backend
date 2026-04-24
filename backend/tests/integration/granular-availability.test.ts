import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser, type TestUser } from "../helpers/auth";

type TestContext = {
  superAdmin: TestUser;
  teamAdmin: TestUser;
  teamId: string;
  offeringId: string;
};

let context: TestContext;

// Returns the next occurrence of `targetDay` (0=Sun..6=Sat) at the given LOCAL hour/minute.
// Using local time is essential because assertBookingAvailabilityAllowed uses Date.getHours()
// (local time) when comparing against HH:mm range strings.
const getNextLocalWeekdayAt = (targetDay: number, hour: number, minute = 0): Date => {
  const now = new Date();
  const currentDay = now.getDay(); // local day
  const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
  const target = new Date();
  target.setDate(now.getDate() + daysAhead);
  target.setHours(hour, minute, 0, 0); // local time
  return target;
};

// Create a new event via HTTP (so weeklyAvailability is persisted properly)
const createEvent = async (
  teamId: string,
  token: string,
  offeringId: string,
  extra: Record<string, unknown> = {},
) => {
  return request(app)
    .post(`/api/teams/${teamId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: `GA Event ${Date.now()}`,
      interactionType: "ONE_TO_MANY",
      assignmentStrategy: "DIRECT",
      bookingMode: "FIXED_SLOTS",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com",
      offeringId,
      isActive: true,
      ...extra,
    });
};

// Create a slot via HTTP
const createSlot = async (
  eventId: string,
  token: string,
  startTime: Date,
  endTime: Date,
) => {
  return request(app)
    .post(`/api/events/${eventId}/schedule-slots`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      capacity: 5,
    });
};

beforeAll(async () => {
  await clearTables();

  const superAdmin = await bootstrapAdmin("super@granular.com", "Admin1234");
  const teamAdmin = await registerUser(superAdmin.token, {
    firstName: "Team",
    lastName: "Admin",
    email: "teamadmin@granular.com",
    password: "TeamAdmin1234",
    role: "TEAM_ADMIN",
  });

  const team = await prisma.team.create({
    data: {
      name: "Granular Avail Team",
      createdById: superAdmin.id,
      teamLeadId: teamAdmin.id,
      publicBookingSlug: "granular-avail-team",
    },
  });

  const offering = await prisma.eventOffering.create({
    data: {
      key: "granular_avail_offering",
      name: "Granular Avail Offering",
      createdById: superAdmin.id,
      updatedById: superAdmin.id,
    },
  });

  context = {
    superAdmin,
    teamAdmin,
    teamId: team.id,
    offeringId: offering.id,
  };
});

afterAll(clearTables);

// ─────────────────────────────────────────────────────────────
// Persistence
// ─────────────────────────────────────────────────────────────

describe("weeklyAvailability — persistence on events", () => {
  it("creates an event with weeklyAvailability and reads it back", async () => {
    const res = await createEvent(context.teamId, context.teamAdmin.token, context.offeringId, {
      weeklyAvailability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
    });

    expect(res.status).toBe(201);
    const avail = res.body.data.weeklyAvailability;
    expect(Array.isArray(avail)).toBe(true);
    expect(avail).toHaveLength(1);
    expect(avail[0].dayOfWeek).toBe(1);
    expect(avail[0].startTime).toBe("09:00");
    expect(avail[0].endTime).toBe("17:00");
  });

  it("PATCH replaces weeklyAvailability in full (old entries are gone)", async () => {
    const created = await createEvent(
      context.teamId,
      context.teamAdmin.token,
      context.offeringId,
      {
        weeklyAvailability: [{ dayOfWeek: 2, startTime: "08:00", endTime: "12:00" }],
      },
    );
    const eventId = created.body.data.id;

    const res = await request(app)
      .patch(`/api/events/${eventId}`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({
        weeklyAvailability: [{ dayOfWeek: 3, startTime: "10:00", endTime: "14:00" }],
      });

    expect(res.status).toBe(200);
    const avail = res.body.data.weeklyAvailability;
    expect(avail).toHaveLength(1);
    expect(avail[0].dayOfWeek).toBe(3);
    // Wednesday entry replaced the Tuesday entry
    expect(avail.some((a: any) => a.dayOfWeek === 2)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// Slot creation — strict mode (day has a weeklyAvailability range)
// ─────────────────────────────────────────────────────────────

describe("Slot creation — strict mode (weeklyAvailability range defined for that day)", () => {
  let eventId: string;
  // Monday range: 09:00–17:00
  const MONDAY = 1;
  const rangeStart = 9;
  const rangeEnd = 17;

  beforeAll(async () => {
    const res = await createEvent(
      context.teamId,
      context.teamAdmin.token,
      context.offeringId,
      {
        weeklyAvailability: [{ dayOfWeek: MONDAY, startTime: "09:00", endTime: "17:00" }],
      },
    );
    eventId = res.body.data.id;
  });

  it("allows a slot that falls entirely within the range", async () => {
    const start = getNextLocalWeekdayAt(MONDAY, 10, 0); // Mon 10:00
    const end = new Date(start.getTime() + 30 * 60 * 1000); // +30 min

    const res = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(res.status).toBe(201);
  });

  it("rejects a slot whose end overflows the range end (partial overflow)", async () => {
    const start = getNextLocalWeekdayAt(MONDAY, 16, 45); // Mon 16:45
    const end = new Date(start.getTime() + 30 * 60 * 1000); // ends 17:15, past range end

    const res = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/outside the allowed time range/i);
  });

  it("rejects a slot that starts before the range begins", async () => {
    const start = getNextLocalWeekdayAt(MONDAY, 8, 30); // Mon 08:30, before 09:00
    const end = new Date(start.getTime() + 30 * 60 * 1000); // ends 09:00

    const res = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/outside the allowed time range/i);
  });

  it("rejects a slot on the range-configured day but outside all ranges", async () => {
    const start = getNextLocalWeekdayAt(MONDAY, 18, 0); // Mon 18:00, well past range end
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/outside the allowed time range/i);
  });

  it("allows a slot that exactly matches the range boundaries", async () => {
    const start = getNextLocalWeekdayAt(MONDAY, rangeStart, 0); // Mon 09:00
    const end = getNextLocalWeekdayAt(MONDAY, rangeEnd, 0);    // Mon 17:00

    // Avoid @@unique([eventId, startTime]) collision with previous tests
    // by ensuring this start time hasn't been used yet (getNextLocalWeekdayAt always
    // returns the next occurrence, so it's always the same Monday).
    // Create a fresh event for boundary test to avoid 409 unique constraint.
    const fresh = await createEvent(context.teamId, context.teamAdmin.token, context.offeringId, {
      weeklyAvailability: [{ dayOfWeek: MONDAY, startTime: "09:00", endTime: "17:00" }],
    });

    const res = await createSlot(fresh.body.data.id, context.teamAdmin.token, start, end);
    expect(res.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────
// Slot creation — allowedWeekdays fallback
// ─────────────────────────────────────────────────────────────

describe("Slot creation — allowedWeekdays fallback (no range for that day)", () => {
  let eventId: string;

  beforeAll(async () => {
    // Only Monday is in allowedWeekdays; no weeklyAvailability entries
    const res = await createEvent(
      context.teamId,
      context.teamAdmin.token,
      context.offeringId,
      { allowedWeekdays: [1] }, // Monday only
    );
    eventId = res.body.data.id;
  });

  it("allows a slot on an allowed weekday", async () => {
    const start = getNextLocalWeekdayAt(1, 10, 0); // Monday
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(res.status).toBe(201);
  });

  it("rejects a slot on a weekday not in allowedWeekdays", async () => {
    const start = getNextLocalWeekdayAt(3, 10, 0); // Wednesday — not in [1]
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const res = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not allowed on this day/i);
  });
});

// ─────────────────────────────────────────────────────────────
// Precedence: weeklyAvailability range beats allowedWeekdays
// ─────────────────────────────────────────────────────────────

describe("Slot creation — weeklyAvailability takes strict precedence over allowedWeekdays", () => {
  it("rejects a slot on an allowedWeekday when that day has a range and the slot is outside it", async () => {
    // Monday is in allowedWeekdays AND has a strict 09:00–12:00 range
    // A slot at Mon 15:00 should be rejected by the range (not allowed by fallback)
    const res = await createEvent(
      context.teamId,
      context.teamAdmin.token,
      context.offeringId,
      {
        allowedWeekdays: [1],
        weeklyAvailability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "12:00" }],
      },
    );
    const eventId = res.body.data.id;

    const start = getNextLocalWeekdayAt(1, 15, 0); // Monday 15:00 — outside 09–12
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const slotRes = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(slotRes.status).toBe(400);
    expect(slotRes.body.message).toMatch(/outside the allowed time range/i);
  });

  it("allows a slot on a day NOT in allowedWeekdays when that day has a matching range", async () => {
    // Monday (1) in allowedWeekdays only, BUT Wednesday (3) has a range 09–17
    // A slot on Wednesday inside the range should succeed (range wins over weekday list)
    const res = await createEvent(
      context.teamId,
      context.teamAdmin.token,
      context.offeringId,
      {
        allowedWeekdays: [1],
        weeklyAvailability: [{ dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }],
      },
    );
    const eventId = res.body.data.id;

    const start = getNextLocalWeekdayAt(3, 10, 0); // Wednesday 10:00 — inside range
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const slotRes = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(slotRes.status).toBe(201);
  });
});

// ─────────────────────────────────────────────────────────────
// Slot update — availability re-validated on time change
// ─────────────────────────────────────────────────────────────

describe("Slot update — weeklyAvailability enforced on PATCH", () => {
  it("rejects a PATCH that moves the slot outside the event range", async () => {
    const res = await createEvent(
      context.teamId,
      context.teamAdmin.token,
      context.offeringId,
      {
        weeklyAvailability: [{ dayOfWeek: 1, startTime: "09:00", endTime: "11:00" }],
      },
    );
    const eventId = res.body.data.id;

    // Create a valid slot (Mon 09:00–09:30)
    const start = getNextLocalWeekdayAt(1, 9, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const slotRes = await createSlot(eventId, context.teamAdmin.token, start, end);
    expect(slotRes.status).toBe(201);
    const slotId = slotRes.body.data.id;

    // Patch to move it to 08:00 — outside range
    const newStart = getNextLocalWeekdayAt(1, 8, 0);
    const newEnd = new Date(newStart.getTime() + 30 * 60 * 1000);

    const patchRes = await request(app)
      .patch(`/api/events/${eventId}/schedule-slots/${slotId}`)
      .set("Authorization", `Bearer ${context.teamAdmin.token}`)
      .send({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.message).toMatch(/outside the allowed time range/i);
  });
});

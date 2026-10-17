import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser, type TestUser } from "../helpers/auth";

// Characterisation tests for the admin slot-debug report (GET /api/events/:eventId/slots/debug).
// Nothing exercised this tool before, so these pin down what it does today — they were written
// and passed against the original implementation before it was refactored, and must keep
// passing unchanged. Dates are always far from "now" (14+ days ahead / years in the past) so
// the tests are not sensitive to the time of day they run. The repo shuffles test order, and
// coach conflicts are per coach across events, so each group of tests uses its OWN date and
// every test that changes data restores it in a `finally`.

let adminToken: string;
let teamId: string;
let eventTypeId: string;
let counter = 0;

const auth = () => ({ Authorization: `Bearer ${adminToken}` });
const dayAhead = (offset: number): Date => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + offset));
};
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const at = (day: Date, hours: number) => new Date(day.getTime() + hours * 3_600_000);
const TARGET = dayAhead(14);

beforeAll(async () => {
  await clearTables();
  adminToken = (await bootstrapAdmin("slotdebug-admin@example.com", "Admin1234")).token;
  const lead = await registerUser(adminToken, {
    firstName: "Lee",
    lastName: "Lead",
    email: "sd-lead@example.com",
    password: "Password1234",
    role: "TEAM_ADMIN",
  });
  eventTypeId = (
    await request(app)
      .post("/api/event-types")
      .set(auth())
      .send({ key: "slotdebug-et", name: "Slot debug", sortOrder: 1, isActive: true })
  ).body.data.id;
  teamId = (
    await request(app)
      .post("/api/teams")
      .set(auth())
      .send({ name: "Slot Debug Team", teamLeadId: lead.id })
  ).body.data.id;
});

afterAll(clearTables);

/**
 * A fresh coach on the team. Weekly hours belong to the coach (not the event), so every group of
 * tests below uses coaches of its own — otherwise one group's hours would overwrite another's.
 */
const newCoach = async (firstName: string, lastName: string): Promise<TestUser> => {
  counter += 1;
  const coach = await registerUser(adminToken, {
    firstName,
    lastName,
    email: `sd-coach-${counter}@example.com`,
    password: "Password1234",
    role: "COACH",
  });
  await request(app).post(`/api/teams/${teamId}/members`).set(auth()).send({ userId: coach.id });
  return coach;
};

type EventOptions = {
  name: string;
  coaches: TestUser[];
  assignmentStrategy?: "DIRECT" | "ROUND_ROBIN";
  durationSeconds?: number;
  fixed?: boolean;
  hours?: { startTime: string; endTime: string; days?: number[] };
};

/** Creates an event with its coach pool, and weekly hours for every coach (default every day). */
const createEvent = async (o: EventOptions): Promise<string> => {
  counter += 1;
  const res = await request(app)
    .post(`/api/teams/${teamId}/events`)
    .set(auth())
    .send({
      name: o.name,
      interactionType: o.fixed ? "ONE_TO_MANY" : "ONE_TO_ONE",
      ...(o.fixed ? { bookingMode: "FIXED_SLOTS", maxParticipantCount: 2 } : {}),
      assignmentStrategy: o.assignmentStrategy ?? "DIRECT",
      durationSeconds: o.durationSeconds ?? 3600,
      bufferAfterMinutes: 0,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com",
      isActive: true,
      eventTypeId,
      ...(o.assignmentStrategy === "DIRECT" || (!o.assignmentStrategy && !o.fixed)
        ? { fixedLeadCoachId: undefined }
        : {}),
    });
  if (res.status !== 201)
    throw new Error(`createEvent ${o.name}: ${res.status} ${JSON.stringify(res.body)}`);
  const eventId = res.body.data.id as string;
  await request(app)
    .put(`/api/events/${eventId}/coaches`)
    .set(auth())
    .send({ coaches: o.coaches.map((c) => ({ userId: c.id })) });
  if (o.hours) {
    const slots = (o.hours.days ?? [0, 1, 2, 3, 4, 5, 6]).map((dayOfWeek) => ({
      dayOfWeek,
      startTime: o.hours!.startTime,
      endTime: o.hours!.endTime,
    }));
    for (const c of o.coaches) {
      await request(app).post(`/api/users/${c.id}/availability/weekly`).set(auth()).send(slots);
    }
  }
  return eventId;
};

const report = async (eventId: string, query: Record<string, string>) =>
  request(app).get(`/api/events/${eventId}/slots/debug`).set(auth()).query(query);

const byTime = (slots: Array<{ startTime: string }>) =>
  Object.fromEntries(slots.map((s) => [s.startTime.slice(11, 16), s])) as Record<string, any>;

describe("GET /api/events/:eventId/slots/debug", () => {
  describe("access and validation", () => {
    let coachA: TestUser;
    let eventId: string;
    beforeAll(async () => {
      coachA = await newCoach("Ann", "One");
      eventId = await createEvent({
        name: "Debug Access",
        coaches: [coachA],
        hours: { startTime: "09:00", endTime: "17:00" },
      });
    });

    it("requires authentication", async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/slots/debug`)
        .query({ date: ymd(TARGET) });
      expect(res.status).toBe(401);
    });

    it("is available to coaches as well as admins", async () => {
      const res = await request(app)
        .get(`/api/events/${eventId}/slots/debug`)
        .set("Authorization", `Bearer ${coachA.token}`)
        .query({ date: ymd(TARGET) });
      expect(res.status).toBe(200);
    });

    it("400s without a date, or with a malformed one", async () => {
      const missing = await report(eventId, {});
      expect(missing.status).toBe(400);
      expect(missing.body.message).toBe("A valid 'date' query param (YYYY-MM-DD) is required.");
      const malformed = await report(eventId, { date: "06/01/2026" });
      expect(malformed.status).toBe(400);
    });

    it("400s a well-formed but impossible date", async () => {
      const res = await report(eventId, { date: "2026-13-45" });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid date provided.");
    });

    it("404s an unknown event", async () => {
      const res = await report("00000000-0000-4000-8000-000000000000", { date: ymd(TARGET) });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Event not found.");
    });
  });

  describe("a single-coach, coach-availability event (9–5, one-hour sessions)", () => {
    let coachA: TestUser;
    let eventId: string;
    let eventName: string;
    beforeAll(async () => {
      coachA = await newCoach("Ann", "One");
      eventName = "Debug Single";
      eventId = await createEvent({
        name: eventName,
        coaches: [coachA],
        hours: { startTime: "09:00", endTime: "17:00" },
      });
    });

    it("describes the event and lists every 15-minute start that fits inside the coach's hours", async () => {
      const res = await report(eventId, { date: ymd(TARGET) });
      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data).toMatchObject({
        date: ymd(TARGET),
        eventName,
        bookingMode: "COACH_AVAILABILITY",
        assignmentStrategy: "DIRECT",
        totalSlots: 29,
        visibleSlots: 29,
        coaches: [{ id: coachA.id, name: "Ann One" }],
      });
      // 09:00 up to 16:00 inclusive — a one-hour session starting at 16:00 still ends by 17:00.
      expect(data.slots[0].startTime).toBe(`${ymd(TARGET)}T09:00:00.000Z`);
      expect(data.slots.at(-1).startTime).toBe(`${ymd(TARGET)}T16:00:00.000Z`);
      expect(data.slots[0]).toEqual({
        startTime: `${ymd(TARGET)}T09:00:00.000Z`,
        endTime: `${ymd(TARGET)}T10:00:00.000Z`,
        visible: true,
        eventLevelStatus: null,
        coaches: [
          {
            coachId: coachA.id,
            coachName: "Ann One",
            decidesVisibility: true,
            status: { status: "available" },
          },
        ],
      });
    });

    it("shows a booking as a conflict on every start time it overlaps, with the conflicting event and times", async () => {
      const booking = await prisma.booking.create({
        data: {
          studentName: "Sam",
          studentEmail: "sam@example.com",
          teamId,
          eventId,
          coachUserId: coachA.id,
          startTime: at(TARGET, 10),
          endTime: at(TARGET, 11),
          status: "CONFIRMED",
        },
      });
      try {
        const res = await report(eventId, { date: ymd(TARGET) });
        const slots = byTime(res.body.data.slots);
        const conflict = {
          status: "conflict",
          conflictingEvent: eventName,
          conflictStart: `${ymd(TARGET)}T10:00:00.000Z`,
          conflictEnd: `${ymd(TARGET)}T11:00:00.000Z`,
        };
        // 09:00–10:00 ends exactly as the booking starts, 11:00 starts exactly as it ends: both are free.
        expect(slots["09:00"].coaches[0].status).toEqual({ status: "available" });
        expect(slots["11:00"].coaches[0].status).toEqual({ status: "available" });
        for (const t of ["09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45"]) {
          expect(slots[t].coaches[0].status).toEqual(conflict);
          expect(slots[t].visible).toBe(false);
        }
        expect(res.body.data).toMatchObject({ totalSlots: 29, visibleSlots: 22 });

        // Viewing while rescheduling that booking: its own time is not a conflict.
        const excluded = await report(eventId, { date: ymd(TARGET), excludeBookingId: booking.id });
        expect(excluded.body.data.visibleSlots).toBe(29);
        expect(byTime(excluded.body.data.slots)["10:00"].coaches[0].status).toEqual({
          status: "available",
        });
      } finally {
        await prisma.booking.delete({ where: { id: booking.id } });
      }
    });

    it("lists nothing for a day on which the coach has no weekly hours", async () => {
      const otherDay = (TARGET.getUTCDay() + 1) % 7;
      const dee = await newCoach("Dee", "Three");
      const id = await createEvent({
        name: "Debug Other Day",
        coaches: [dee],
        hours: { startTime: "09:00", endTime: "17:00", days: [otherDay] },
      });
      const res = await report(id, { date: ymd(TARGET) });
      expect(res.body.data).toMatchObject({ totalSlots: 0, visibleSlots: 0, slots: [] });
    });

    it("lists nothing on a day the coach has blocked off with an all-day exception", async () => {
      const exception = await prisma.userAvailabilityException.create({
        data: { userId: coachA.id, date: TARGET, isUnavailable: true },
      });
      try {
        const res = await report(eventId, { date: ymd(TARGET) });
        expect(res.body.data).toMatchObject({ totalSlots: 0, slots: [] });
      } finally {
        await prisma.userAvailabilityException.delete({ where: { id: exception.id } });
      }
    });

    it("flags every start time on a past date as in the past, with no per-coach detail", async () => {
      const res = await report(eventId, { date: "2020-01-06" });
      expect(res.body.data.totalSlots).toBe(29);
      expect(res.body.data.visibleSlots).toBe(0);
      expect(res.body.data.slots[0]).toEqual({
        startTime: "2020-01-06T09:00:00.000Z",
        endTime: "2020-01-06T10:00:00.000Z",
        visible: false,
        eventLevelStatus: { status: "in_the_past" },
        coaches: [],
      });
    });
  });

  describe("a round-robin pool of two coaches (30-minute sessions, 10:00–11:00)", () => {
    const TARGET = dayAhead(15);
    let coachA: TestUser;
    let coachB: TestUser;
    let eventId: string;
    const bookFor = (coach: TestUser, name: string) =>
      prisma.booking.create({
        data: {
          studentName: name,
          studentEmail: `${name}@example.com`,
          teamId,
          eventId,
          coachUserId: coach.id,
          startTime: at(TARGET, 10),
          endTime: at(TARGET, 10.5),
          status: "CONFIRMED",
        },
      });

    beforeAll(async () => {
      coachA = await newCoach("Ann", "One");
      coachB = await newCoach("Bob", "Two");
      eventId = await createEvent({
        name: "Debug Pool",
        coaches: [coachA, coachB],
        assignmentStrategy: "ROUND_ROBIN",
        durationSeconds: 1800,
        hours: { startTime: "10:00", endTime: "11:00" },
      });
    });

    it("evaluates every coach, and every coach decides visibility", async () => {
      const res = await report(eventId, { date: ymd(TARGET) });
      expect(res.body.data.slots.map((s: any) => s.startTime.slice(11, 16))).toEqual([
        "10:00",
        "10:15",
        "10:30",
      ]);
      expect(res.body.data.coaches).toEqual([
        { id: coachA.id, name: "Ann One" },
        { id: coachB.id, name: "Bob Two" },
      ]);
      expect(
        res.body.data.slots[0].coaches.map((c: any) => [
          c.coachName,
          c.decidesVisibility,
          c.status.status,
        ]),
      ).toEqual([
        ["Ann One", true, "available"],
        ["Bob Two", true, "available"],
      ]);
    });

    it("stays visible while at least one coach in the pool is free, and hides when all are busy", async () => {
      const created: string[] = [];
      try {
        created.push((await bookFor(coachA, "first")).id);
        let slot = byTime((await report(eventId, { date: ymd(TARGET) })).body.data.slots)["10:00"];
        expect(slot.visible).toBe(true);
        expect(slot.coaches.map((c: any) => [c.coachName, c.status.status])).toEqual([
          ["Ann One", "conflict"],
          ["Bob Two", "available"],
        ]);

        created.push((await bookFor(coachB, "second")).id);
        const res = await report(eventId, { date: ymd(TARGET) });
        slot = byTime(res.body.data.slots)["10:00"];
        expect(slot.visible).toBe(false);
        expect(slot.coaches.map((c: any) => c.status.status)).toEqual(["conflict", "conflict"]);
        expect(res.body.data).toMatchObject({ totalSlots: 3, visibleSlots: 1 });
      } finally {
        await prisma.booking.deleteMany({ where: { id: { in: created } } });
      }
    });
  });

  describe("event-level limits", () => {
    const TARGET = dayAhead(16);
    let coachA: TestUser;
    let eventId: string;
    beforeAll(async () => {
      coachA = await newCoach("Ann", "One");
      eventId = await createEvent({
        name: "Debug Limits",
        coaches: [coachA],
        durationSeconds: 1800,
        hours: { startTime: "10:00", endTime: "11:00" },
      });
    });
    afterEach(async () => {
      await prisma.event.update({
        where: { id: eventId },
        data: { maxBookingWindowDays: null, minimumNoticeMinutes: 0 },
      });
    });

    it("flags slots beyond the booking window, in UTC or in the student's timezone", async () => {
      await prisma.event.update({ where: { id: eventId }, data: { maxBookingWindowDays: 1 } });
      const queries: Array<Record<string, string>> = [
        { date: ymd(TARGET) },
        { date: ymd(TARGET), timezone: "Pacific/Kiritimati" },
      ];
      for (const query of queries) {
        const res = await report(eventId, query);
        expect(res.body.data.slots[0]).toMatchObject({
          visible: false,
          eventLevelStatus: { status: "booking_window", maxBookingWindowDays: 1 },
          coaches: [],
        });
      }
    });

    it("flags slots that do not meet the minimum notice", async () => {
      await prisma.event.update({
        where: { id: eventId },
        data: { minimumNoticeMinutes: 60 * 24 * 30 },
      });
      const res = await report(eventId, { date: ymd(TARGET) });
      expect(res.body.data.slots[0]).toMatchObject({
        visible: false,
        eventLevelStatus: { status: "notice_window", minimumNoticeMinutes: 43200 },
        coaches: [],
      });
    });
  });

  describe("a fixed-slot event", () => {
    const TARGET = dayAhead(17);
    let coachA: TestUser;
    let coachB: TestUser;
    let eventId: string;
    let ids: { open: string; full: string; assigned: string; series2: string };
    beforeAll(async () => {
      coachA = await newCoach("Ann", "One");
      coachB = await newCoach("Bob", "Two");
      eventId = await createEvent({
        name: "Debug Fixed",
        coaches: [coachA, coachB],
        assignmentStrategy: "ROUND_ROBIN",
        durationSeconds: 1800,
        fixed: true,
      });
      const mk = (hour: number, extra: Record<string, unknown> = {}) =>
        prisma.eventScheduleSlot.create({
          data: { eventId, startTime: at(TARGET, hour), endTime: at(TARGET, hour + 0.5), ...extra },
        });
      const open = await mk(9);
      const full = await mk(10, { capacity: 1 });
      const assigned = await mk(11, { assignedCoachId: coachB.id });
      const series2 = await mk(12);
      ids = { open: open.id, full: full.id, assigned: assigned.id, series2: series2.id };
      await prisma.booking.create({
        data: {
          studentName: "Fay",
          studentEmail: "fay@example.com",
          teamId,
          eventId,
          coachUserId: coachA.id,
          scheduleSlotId: full.id,
          startTime: full.startTime,
          endTime: full.endTime,
          status: "CONFIRMED",
        },
      });
    });

    it("lists the event's scheduled slots rather than generating intervals", async () => {
      const res = await report(eventId, { date: ymd(TARGET) });
      expect(res.body.data).toMatchObject({
        bookingMode: "FIXED_SLOTS",
        assignmentStrategy: "ROUND_ROBIN",
        totalSlots: 4,
        visibleSlots: 3,
      });
      expect(res.body.data.slots.map((s: any) => s.scheduleSlotId)).toEqual([
        ids.open,
        ids.full,
        ids.assigned,
        ids.series2,
      ]);
    });

    it("shows a full slot as capacity_full with no per-coach detail", async () => {
      const slot = byTime((await report(eventId, { date: ymd(TARGET) })).body.data.slots)["10:00"];
      expect(slot).toMatchObject({
        visible: false,
        eventLevelStatus: { status: "capacity_full", remaining: 0 },
        coaches: [],
      });
    });

    it("evaluates the whole pool for an unassigned slot, but only the assigned coach for an assigned one", async () => {
      const slots = byTime((await report(eventId, { date: ymd(TARGET) })).body.data.slots);
      expect(
        slots["09:00"].coaches.map((c: any) => [c.coachName, c.decidesVisibility, c.status.status]),
      ).toEqual([
        ["Ann One", true, "available"],
        ["Bob Two", true, "available"],
      ]);
      expect(
        slots["11:00"].coaches.map((c: any) => [c.coachName, c.decidesVisibility, c.status.status]),
      ).toEqual([["Bob Two", true, "available"]]);
    });

    it("hides slots beyond a recurring series' visibility limit, and shows the earlier ones", async () => {
      const series = await prisma.recurrenceGroup.create({
        data: { eventId, frequency: "WEEKLY", recurrenceVisibilityLimit: 1 },
      });
      try {
        await prisma.eventScheduleSlot.updateMany({
          where: { id: { in: [ids.open, ids.series2] } },
          data: { recurrenceGroupId: series.id },
        });
        const slots = byTime((await report(eventId, { date: ymd(TARGET) })).body.data.slots);
        expect(slots["09:00"]).toMatchObject({ visible: true, eventLevelStatus: null });
        expect(slots["12:00"]).toMatchObject({
          visible: false,
          eventLevelStatus: { status: "recurrence_limit" },
          coaches: [],
        });
      } finally {
        await prisma.eventScheduleSlot.updateMany({
          where: { id: { in: [ids.open, ids.series2] } },
          data: { recurrenceGroupId: null },
        });
        await prisma.recurrenceGroup.delete({ where: { id: series.id } });
      }
    });
  });
});

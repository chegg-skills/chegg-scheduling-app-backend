import { createAvailabilityDebugService } from "../../src/domain/availability/availabilityDebug.service";
import type { AvailabilityDebugRepository } from "../../src/domain/availability/availabilityDebug.repository";
import { toLocalAvailabilityInfo } from "../../src/domain/availability/availability.shared";
import { ErrorHandler } from "../../src/shared/error/errorhandler";

const MIN = 60 * 1000;
const NOW = new Date("2026-06-01T08:00:00.000Z");
const DATE = "2026-06-10"; // a future day, well outside any notice window
const DAY_START = new Date(`${DATE}T00:00:00.000Z`);
const DAY_END = new Date(DAY_START.getTime() + 24 * 60 * MIN);
const dow = toLocalAvailabilityInfo(new Date(`${DATE}T12:00:00.000Z`), "UTC").dayOfWeek;

const profile = (id: string, timezone = "UTC") => ({
  id,
  firstName: id.toUpperCase(),
  lastName: "Coach",
  timezone,
});
// Hours on every weekday, so any date (including the past one used below) has hours.
const weekly = (userId: string, startTime = "10:00", endTime = "11:00") =>
  [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ userId, dayOfWeek, startTime, endTime }));

const windowEvent = (overrides: Record<string, unknown> = {}) => ({
  id: "e-1",
  name: "Debug Event",
  interactionType: "ONE_TO_ONE",
  bookingMode: "COACH_AVAILABILITY",
  assignmentStrategy: "ROUND_ROBIN",
  durationSeconds: 1800,
  bufferAfterMinutes: 0,
  minimumNoticeMinutes: 0,
  maxBookingWindowDays: null,
  maxParticipantCount: null,
  coaches: [{ coachUserId: "c-1" }, { coachUserId: "c-2" }],
  scheduleSlots: [],
  ...overrides,
});

const fixedEvent = (slots: unknown[], overrides: Record<string, unknown> = {}) =>
  windowEvent({
    interactionType: "ONE_TO_MANY",
    bookingMode: "FIXED_SLOTS",
    maxParticipantCount: 5,
    scheduleSlots: slots,
    ...overrides,
  });

const fixedSlot = (overrides: Record<string, unknown> = {}) => ({
  id: "s-1",
  startTime: new Date(`${DATE}T09:00:00.000Z`),
  endTime: new Date(`${DATE}T09:30:00.000Z`),
  capacity: null,
  assignedCoachId: null,
  recurrenceGroupId: null,
  ...overrides,
});

const makeRepo = (
  event: unknown,
  overrides: Partial<AvailabilityDebugRepository> = {},
): AvailabilityDebugRepository => ({
  findEventForDay: jest.fn().mockResolvedValue(event),
  findCoachProfiles: jest.fn().mockResolvedValue([profile("c-1"), profile("c-2")]),
  findWeeklyForCoaches: jest.fn().mockResolvedValue([...weekly("c-1"), ...weekly("c-2")]),
  findExceptionsForCoaches: jest.fn().mockResolvedValue([]),
  findEventCoachOverrides: jest.fn().mockResolvedValue([]),
  findConflictBookings: jest.fn().mockResolvedValue([]),
  findConflictSlots: jest.fn().mockResolvedValue([]),
  countActiveBookingsForSlot: jest.fn().mockResolvedValue(0),
  findRecurrenceVisibilityLimits: jest.fn().mockResolvedValue([]),
  findUpcomingSlotIdsInGroup: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const make = (event: unknown, repoOverrides: Partial<AvailabilityDebugRepository> = {}) => {
  const repo = makeRepo(event, repoOverrides);
  const deps = {
    replenishContinuousSlots: jest.fn().mockResolvedValue(undefined),
    evaluateCoachAvailability: jest.fn().mockResolvedValue({ available: true, reason: null }),
  };
  return { service: createAvailabilityDebugService(repo, deps as never), repo, deps };
};

const hhmm = (s: { startTime: string }) => s.startTime.slice(11, 16);

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

describe("createAvailabilityDebugService.getSlotDebugReport (fake repository)", () => {
  describe("setup and errors", () => {
    it("tops up continuous slots first, then loads the requested UTC day", async () => {
      const { service, repo, deps } = make(windowEvent());
      await service.getSlotDebugReport("e-1", DATE);
      expect(deps.replenishContinuousSlots).toHaveBeenCalledWith("e-1");
      expect(deps.replenishContinuousSlots.mock.invocationCallOrder[0]).toBeLessThan(
        (repo.findEventForDay as jest.Mock).mock.invocationCallOrder[0],
      );
      expect(repo.findEventForDay).toHaveBeenCalledWith("e-1", DAY_START, DAY_END);
    });

    it("400s an impossible date — after the top-up has already run (existing behaviour)", async () => {
      const { service, repo, deps } = make(windowEvent());
      const error = await service.getSlotDebugReport("e-1", "2026-13-45").catch((e) => e);
      expect(error).toBeInstanceOf(ErrorHandler);
      expect(error.statusCode).toBe(400);
      expect(deps.replenishContinuousSlots).toHaveBeenCalledTimes(1);
      expect(repo.findEventForDay).not.toHaveBeenCalled();
    });

    it("404s an unknown event", async () => {
      const { service } = make(null);
      const error = await service.getSlotDebugReport("e-1", DATE).catch((e) => e);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Event not found.");
    });
  });

  describe("batching", () => {
    it("fetches calendar and conflict data once for all coaches, with a window that covers the session and buffer", async () => {
      const { service, repo } = make(
        windowEvent({ durationSeconds: 3600, bufferAfterMinutes: 15 }),
      );
      await service.getSlotDebugReport("e-1", DATE, { excludeBookingId: "b-self" });
      const batchEnd = new Date(DAY_END.getTime() + 3600 * 1000 + 15 * MIN);
      const lookback = new Date(DAY_START.getTime() - 120 * MIN);
      expect(repo.findCoachProfiles).toHaveBeenCalledTimes(1);
      expect(repo.findCoachProfiles).toHaveBeenCalledWith(["c-1", "c-2"]);
      expect(repo.findWeeklyForCoaches).toHaveBeenCalledTimes(1);
      expect(repo.findExceptionsForCoaches).toHaveBeenCalledWith(
        ["c-1", "c-2"],
        DAY_START,
        batchEnd,
      );
      expect(repo.findEventCoachOverrides).toHaveBeenCalledWith("e-1", ["c-1", "c-2"]);
      expect(repo.findConflictBookings).toHaveBeenCalledWith({
        coachIds: ["c-1", "c-2"],
        lookbackStart: lookback,
        rangeEnd: batchEnd,
        excludeBookingId: "b-self",
      });
      expect(repo.findConflictSlots).toHaveBeenCalledWith(["c-1", "c-2"], lookback, batchEnd);
    });

    it("makes none of those batch reads for fixed-slot events, but still loads the coaches' names", async () => {
      const { service, repo } = make(fixedEvent([fixedSlot()]));
      await service.getSlotDebugReport("e-1", DATE);
      expect(repo.findCoachProfiles).toHaveBeenCalledTimes(1);
      for (const fn of [
        repo.findWeeklyForCoaches,
        repo.findExceptionsForCoaches,
        repo.findEventCoachOverrides,
        repo.findConflictBookings,
        repo.findConflictSlots,
      ]) {
        expect(fn).not.toHaveBeenCalled();
      }
    });
  });

  describe("coach-availability events", () => {
    it("lists only start times inside some coach's weekly window (here 10:00–11:00, 30-minute sessions)", async () => {
      const { service } = make(windowEvent());
      const report = await service.getSlotDebugReport("e-1", DATE);
      expect(report.slots.map(hhmm)).toEqual(["10:00", "10:15", "10:30"]);
      expect(report).toMatchObject({
        date: DATE,
        eventName: "Debug Event",
        totalSlots: 3,
        visibleSlots: 3,
      });
      expect(report.coaches).toEqual([
        { id: "c-1", name: "C-1 Coach" },
        { id: "c-2", name: "C-2 Coach" },
      ]);
    });

    it("lists nothing when the coaches have no hours that day", async () => {
      const { service } = make(windowEvent(), {
        findWeeklyForCoaches: jest.fn().mockResolvedValue([]),
      });
      expect((await service.getSlotDebugReport("e-1", DATE)).slots).toEqual([]);
    });

    it("an event-specific weekly override replaces the coach's global hours for trimming", async () => {
      const { service } = make(windowEvent(), {
        findEventCoachOverrides: jest.fn().mockResolvedValue([
          { coachUserId: "c-1", dayOfWeek: dow, startTime: "13:00", endTime: "14:00" },
          { coachUserId: "c-2", dayOfWeek: dow, startTime: "13:00", endTime: "14:00" },
        ]),
      });
      expect((await service.getSlotDebugReport("e-1", DATE)).slots.map(hhmm)).toEqual([
        "13:00",
        "13:15",
        "13:30",
      ]);
    });

    it("hands each coach's check the pre-fetched data, plus excludeBookingId and the buffer", async () => {
      const { service, deps } = make(windowEvent({ bufferAfterMinutes: 10 }));
      await service.getSlotDebugReport("e-1", DATE, { excludeBookingId: "b-self" });
      const options = deps.evaluateCoachAvailability.mock.calls[0][3];
      expect(deps.evaluateCoachAvailability.mock.calls[0][0]).toBe("c-1");
      expect(options).toMatchObject({
        ignoreWeeklySchedule: false,
        weeklyOverride: [],
        bufferAfterMinutes: 10,
        excludeBookingId: "b-self",
        timezone: "UTC",
        calendarData: { weekly: weekly("c-1"), exceptions: [] },
        prefetchedConflicts: [],
      });
      expect(options.eventId).toBeUndefined();
    });

    it("drops start times where every coach is merely outside their hours (the cross-midnight edge)", async () => {
      const outside = { available: false, reason: "outside_availability" };
      const { service, deps } = make(windowEvent());
      deps.evaluateCoachAvailability.mockResolvedValue(outside);
      const report = await service.getSlotDebugReport("e-1", DATE);
      expect(report.slots).toEqual([]);
    });
  });

  describe("how each coach's verdict is reported", () => {
    const reportFor = async (
      verdict: unknown,
      event = windowEvent({ coaches: [{ coachUserId: "c-1" }] }),
    ) => {
      const { service, deps } = make(event);
      deps.evaluateCoachAvailability.mockResolvedValue(verdict);
      const report = await service.getSlotDebugReport("e-1", DATE);
      return report.slots[0].coaches[0].status;
    };

    it("conflict: names the conflicting event and its times", async () => {
      const conflict = {
        event: { name: "Intro" },
        startTime: new Date(`${DATE}T10:00:00.000Z`),
        endTime: new Date(`${DATE}T11:00:00.000Z`),
      };
      expect(await reportFor({ available: false, reason: "conflict", conflict })).toEqual({
        status: "conflict",
        conflictingEvent: "Intro",
        conflictStart: `${DATE}T10:00:00.000Z`,
        conflictEnd: `${DATE}T11:00:00.000Z`,
      });
    });

    it("conflict without detail: falls back to a generic name and the slot's own times", async () => {
      expect(await reportFor({ available: false, reason: "conflict" })).toEqual({
        status: "conflict",
        conflictingEvent: "Existing booking",
        conflictStart: `${DATE}T10:00:00.000Z`,
        conflictEnd: `${DATE}T10:30:00.000Z`,
      });
    });

    it("exception_block and invalid_timezone pass straight through", async () => {
      expect(await reportFor({ available: false, reason: "exception_block" })).toEqual({
        status: "exception_block",
      });
      expect(await reportFor({ available: false, reason: "invalid_timezone" })).toEqual({
        status: "invalid_timezone",
      });
    });

    it("outside_availability: lists the coach's weekly windows for that day (window-mode events only)", async () => {
      const { service, deps } = make(windowEvent(), {
        findWeeklyForCoaches: jest
          .fn()
          .mockResolvedValue([
            ...weekly("c-1", "10:00", "11:00"),
            ...weekly("c-1", "12:00", "13:00"),
            ...weekly("c-2", "10:00", "11:00"),
          ]),
      });
      // c-1 is reported outside hours, c-2 is free — so the start time is kept (not every coach is outside).
      deps.evaluateCoachAvailability.mockImplementation(async (id: string) =>
        id === "c-1"
          ? { available: false, reason: "outside_availability" }
          : { available: true, reason: null },
      );
      const slot = (await service.getSlotDebugReport("e-1", DATE)).slots[0];
      expect(slot.coaches[0].status).toEqual({
        status: "outside_availability",
        windows: ["10:00–11:00", "12:00–13:00"],
      });
      expect(slot.coaches[1].status).toEqual({ status: "available" });
    });

    it("outside_availability in a fixed-slot event carries no windows (weekly hours are not loaded there)", async () => {
      const fixed = make(fixedEvent([fixedSlot()], { coaches: [{ coachUserId: "c-1" }] }));
      fixed.deps.evaluateCoachAvailability.mockResolvedValue({
        available: false,
        reason: "outside_availability",
      });
      const report = await fixed.service.getSlotDebugReport("e-1", DATE);
      expect(report.slots[0].coaches[0].status).toEqual({
        status: "outside_availability",
        windows: [],
      });
    });
  });

  describe("who decides whether a slot is visible", () => {
    const run = async (event: unknown, evaluate: (id: string) => boolean) => {
      const { service, deps } = make(event);
      deps.evaluateCoachAvailability.mockImplementation(async (id: string) =>
        evaluate(id)
          ? { available: true, reason: null }
          : { available: false, reason: "exception_block" },
      );
      return (await service.getSlotDebugReport("e-1", DATE)).slots[0];
    };

    it("a pool is visible if ANY coach is free, and every coach decides", async () => {
      const slot = await run(fixedEvent([fixedSlot()]), (id) => id === "c-2");
      expect(slot.visible).toBe(true);
      expect(slot.coaches.map((c) => [c.coachId, c.decidesVisibility, c.status.status])).toEqual([
        ["c-1", true, "exception_block"],
        ["c-2", true, "available"],
      ]);
    });

    it("DIRECT assignment: only the primary (first) coach decides", async () => {
      const slot = await run(
        fixedEvent([fixedSlot()], { assignmentStrategy: "DIRECT" }),
        (id) => id === "c-2",
      );
      expect(slot.visible).toBe(false); // c-2 is free but is not the one that decides
      expect(slot.coaches.map((c) => [c.coachId, c.decidesVisibility])).toEqual([
        ["c-1", true],
        ["c-2", false],
      ]);
    });

    it("a slot with an assigned coach shows only that coach", async () => {
      const slot = await run(fixedEvent([fixedSlot({ assignedCoachId: "c-2" })]), () => true);
      expect(slot.coaches).toEqual([
        {
          coachId: "c-2",
          coachName: "C-2 Coach",
          decidesVisibility: true,
          status: { status: "available" },
        },
      ]);
      expect(slot.visible).toBe(true);
    });

    it("falls back to the coach id when a coach has no profile row", async () => {
      const { service } = make(fixedEvent([fixedSlot({ assignedCoachId: "ghost" })]), {
        findCoachProfiles: jest.fn().mockResolvedValue([]),
      });
      const slot = (await service.getSlotDebugReport("e-1", DATE)).slots[0];
      expect(slot.coaches[0].coachName).toBe("ghost");
    });

    it("fixed-slot checks ignore weekly hours and carry the event and slot ids", async () => {
      const { service, deps } = make(fixedEvent([fixedSlot()]));
      await service.getSlotDebugReport("e-1", DATE);
      expect(deps.evaluateCoachAvailability.mock.calls[0][3]).toMatchObject({
        ignoreWeeklySchedule: true,
        eventId: "e-1",
        scheduleSlotId: "s-1",
      });
    });
  });

  describe("event-level blocks (applied to every coach at once)", () => {
    const first = async (
      event: unknown,
      repo: Partial<AvailabilityDebugRepository> = {},
      date = DATE,
    ) => {
      const { service, deps } = make(event, repo);
      const report = await service.getSlotDebugReport("e-1", date);
      return { slot: report.slots[0], deps, report };
    };

    it("past: a date before now", async () => {
      const { slot, deps } = await first(windowEvent(), {}, "2020-01-06");
      expect(slot).toMatchObject({
        visible: false,
        eventLevelStatus: { status: "in_the_past" },
        coaches: [],
      });
      expect(deps.evaluateCoachAvailability).not.toHaveBeenCalled();
    });

    it("booking window: beyond maxBookingWindowDays (UTC, or the student's timezone when given)", async () => {
      const event = windowEvent({ maxBookingWindowDays: 1 });
      expect((await first(event)).slot.eventLevelStatus).toEqual({
        status: "booking_window",
        maxBookingWindowDays: 1,
      });
      const { service } = make(event);
      const withTz = await service.getSlotDebugReport("e-1", DATE, {
        timezone: "Pacific/Kiritimati",
      });
      expect(withTz.slots[0].eventLevelStatus).toEqual({
        status: "booking_window",
        maxBookingWindowDays: 1,
      });
    });

    it("notice window: closer than minimumNoticeMinutes", async () => {
      const { slot } = await first(windowEvent({ minimumNoticeMinutes: 60 * 24 * 30 }));
      expect(slot.eventLevelStatus).toEqual({
        status: "notice_window",
        minimumNoticeMinutes: 43200,
      });
    });

    it("capacity: a full slot reports zero remaining, and only counts bookings when a cap applies", async () => {
      const full = await first(fixedEvent([fixedSlot({ capacity: 2 })]), {
        countActiveBookingsForSlot: jest.fn().mockResolvedValue(2),
      });
      expect(full.slot.eventLevelStatus).toEqual({ status: "capacity_full", remaining: 0 });

      const uncapped = await first(fixedEvent([fixedSlot()], { maxParticipantCount: null }));
      expect(uncapped.slot.eventLevelStatus).toBeNull();
      const { service, repo } = make(fixedEvent([fixedSlot()], { maxParticipantCount: null }));
      await service.getSlotDebugReport("e-1", DATE);
      expect(repo.countActiveBookingsForSlot).not.toHaveBeenCalled();
    });

    describe("recurrence visibility limit", () => {
      const series = [
        fixedSlot({ id: "s-1", recurrenceGroupId: "g-1" }),
        fixedSlot({
          id: "s-2",
          recurrenceGroupId: "g-1",
          startTime: new Date(`${DATE}T10:00:00.000Z`),
          endTime: new Date(`${DATE}T10:30:00.000Z`),
        }),
        fixedSlot({
          id: "s-3",
          startTime: new Date(`${DATE}T11:00:00.000Z`),
          endTime: new Date(`${DATE}T11:30:00.000Z`),
        }),
      ];

      it("hides the series' slots beyond the next N upcoming ones; one-off slots are unaffected", async () => {
        const { service, repo } = make(fixedEvent(series), {
          findRecurrenceVisibilityLimits: jest
            .fn()
            .mockResolvedValue([{ id: "g-1", recurrenceVisibilityLimit: 1 }]),
          findUpcomingSlotIdsInGroup: jest.fn().mockResolvedValue([{ id: "s-1" }]),
        });
        const report = await service.getSlotDebugReport("e-1", DATE);
        expect(
          report.slots.map((s) => [s.scheduleSlotId, s.eventLevelStatus?.status ?? null]),
        ).toEqual([
          ["s-1", null],
          ["s-2", "recurrence_limit"],
          ["s-3", null],
        ]);
        expect(repo.findRecurrenceVisibilityLimits).toHaveBeenCalledWith(["g-1"]);
        expect(repo.findUpcomingSlotIdsInGroup).toHaveBeenCalledWith("g-1", NOW, 1);
      });

      it("does nothing for a series without a limit, or when no slot belongs to a series", async () => {
        const unlimited = make(fixedEvent(series), {
          findRecurrenceVisibilityLimits: jest
            .fn()
            .mockResolvedValue([{ id: "g-1", recurrenceVisibilityLimit: null }]),
        });
        await unlimited.service.getSlotDebugReport("e-1", DATE);
        expect(unlimited.repo.findUpcomingSlotIdsInGroup).not.toHaveBeenCalled();

        const none = make(fixedEvent([fixedSlot()]));
        await none.service.getSlotDebugReport("e-1", DATE);
        expect(none.repo.findRecurrenceVisibilityLimits).not.toHaveBeenCalled();
      });
    });
  });
});

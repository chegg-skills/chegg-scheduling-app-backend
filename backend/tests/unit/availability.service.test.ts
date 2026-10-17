import {
  createAvailabilityService,
  endOfBookingWindowInTimezone,
} from "../../src/domain/availability/availability.service";
import type { AvailabilitySlotsRepository } from "../../src/domain/availability/availabilitySlots.repository";

const MIN = 60 * 1000;
const NOW = new Date("2026-06-01T08:00:00.000Z");
// One hour tomorrow: 15-minute steps give slots starting 09:00, 09:15, 09:30, 09:45.
const START = new Date("2026-06-02T09:00:00.000Z");
const END = new Date("2026-06-02T10:00:00.000Z");

const coach = (id: string) => ({ coachUserId: id });

const windowEvent = (overrides: Record<string, unknown> = {}) => ({
  id: "e-1",
  interactionType: "ONE_TO_ONE",
  bookingMode: "COACH_AVAILABILITY",
  assignmentStrategy: "ROUND_ROBIN",
  durationSeconds: 1800,
  bufferAfterMinutes: 0,
  minimumNoticeMinutes: 0,
  maxBookingWindowDays: null,
  maxParticipantCount: null,
  coaches: [coach("c-1"), coach("c-2")],
  scheduleSlots: [],
  ...overrides,
});

const fixedSlot = (overrides: Record<string, unknown> = {}) => ({
  id: "s-1",
  startTime: new Date("2026-06-02T09:00:00.000Z"),
  endTime: new Date("2026-06-02T09:30:00.000Z"),
  capacity: null,
  assignedCoachId: null,
  assignedCoach: null,
  recurrenceGroupId: null,
  ...overrides,
});

const fixedEvent = (overrides: Record<string, unknown> = {}) =>
  windowEvent({
    interactionType: "ONE_TO_MANY",
    bookingMode: "FIXED_SLOTS",
    maxParticipantCount: 5,
    scheduleSlots: [fixedSlot()],
    ...overrides,
  });

const makeRepo = (
  event: unknown,
  overrides: Partial<AvailabilitySlotsRepository> = {},
): AvailabilitySlotsRepository => ({
  findEventForSlots: jest.fn().mockResolvedValue(event),
  findEventCoachOverrides: jest.fn().mockResolvedValue([]),
  findCoachTimezones: jest.fn().mockResolvedValue([
    { id: "c-1", timezone: "UTC" },
    { id: "c-2", timezone: "Asia/Kolkata" },
  ]),
  findWeeklyForCoaches: jest.fn().mockResolvedValue([]),
  findExceptionsForCoaches: jest.fn().mockResolvedValue([]),
  findConflictBookings: jest.fn().mockResolvedValue([]),
  findConflictSlots: jest.fn().mockResolvedValue([]),
  countActiveBookingsForSlot: jest.fn().mockResolvedValue(0),
  findRecurrenceVisibilityLimits: jest.fn().mockResolvedValue([]),
  findUpcomingSlotIdsInGroup: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const make = (
  event: unknown,
  repoOverrides: Partial<AvailabilitySlotsRepository> = {},
  available = true,
) => {
  const repo = makeRepo(event, repoOverrides);
  const deps = {
    replenishContinuousSlots: jest.fn().mockResolvedValue(undefined),
    isCoachAvailable: jest.fn().mockResolvedValue(available),
  };
  return { service: createAvailabilityService(repo, deps as never), repo, deps };
};

const starts = (slots: Array<{ startTime: string }>) => slots.map((s) => s.startTime.slice(11, 16));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

describe("createAvailabilityService.getAvailableSlots (fake repository)", () => {
  describe("setup and early exits", () => {
    it("tops up continuous slots first, then loads the event", async () => {
      const { service, repo, deps } = make(windowEvent());
      await service.getAvailableSlots("e-1", START, END);
      expect(deps.replenishContinuousSlots).toHaveBeenCalledWith("e-1");
      expect(deps.replenishContinuousSlots.mock.invocationCallOrder[0]).toBeLessThan(
        (repo.findEventForSlots as jest.Mock).mock.invocationCallOrder[0],
      );
      expect(repo.findEventForSlots).toHaveBeenCalledWith("e-1", START, END);
    });

    it("returns nothing for an unknown event or one without coaches, without further queries", async () => {
      for (const event of [null, windowEvent({ coaches: [] })]) {
        const { service, repo } = make(event);
        expect(await service.getAvailableSlots("e-1", START, END)).toEqual([]);
        expect(repo.findEventCoachOverrides).not.toHaveBeenCalled();
        expect(repo.findCoachTimezones).not.toHaveBeenCalled();
      }
    });

    it("returns nothing when the preferred coach is not on the event", async () => {
      const { service, repo, deps } = make(windowEvent());
      expect(await service.getAvailableSlots("e-1", START, END, "someone-else")).toEqual([]);
      expect(repo.findCoachTimezones).not.toHaveBeenCalled();
      expect(deps.isCoachAvailable).not.toHaveBeenCalled();
    });
  });

  describe("coach-availability events: batching", () => {
    it("fetches each kind of data ONCE for all coaches, however many slots there are", async () => {
      const { service, repo } = make(windowEvent());
      const slots = await service.getAvailableSlots("e-1", START, END);
      expect(slots).toHaveLength(4);
      for (const fn of [
        repo.findEventCoachOverrides,
        repo.findCoachTimezones,
        repo.findWeeklyForCoaches,
        repo.findExceptionsForCoaches,
        repo.findConflictBookings,
        repo.findConflictSlots,
      ]) {
        expect(fn).toHaveBeenCalledTimes(1);
      }
      expect(repo.countActiveBookingsForSlot).not.toHaveBeenCalled();
    });

    it("widens the fetch window by the session length and buffer, and looks 120 minutes back for conflicts", async () => {
      const { service, repo } = make(
        windowEvent({ durationSeconds: 3600, bufferAfterMinutes: 15 }),
      );
      await service.getAvailableSlots("e-1", START, END);
      const batchEnd = new Date(END.getTime() + 3600 * 1000 + 15 * MIN);
      const lookback = new Date(START.getTime() - 120 * MIN);
      expect(repo.findExceptionsForCoaches).toHaveBeenCalledWith(["c-1", "c-2"], START, batchEnd);
      expect(repo.findConflictBookings).toHaveBeenCalledWith(["c-1", "c-2"], lookback, batchEnd);
      expect(repo.findConflictSlots).toHaveBeenCalledWith(["c-1", "c-2"], lookback, batchEnd);
      expect(repo.findEventCoachOverrides).toHaveBeenCalledWith("e-1", ["c-1", "c-2"]);
    });

    it("only fetches data for the preferred coach when one is given", async () => {
      const { service, repo } = make(windowEvent());
      await service.getAvailableSlots("e-1", START, END, "c-2");
      expect(repo.findCoachTimezones).toHaveBeenCalledWith(["c-2"]);
    });
  });

  describe("coach-availability events: which slots come back", () => {
    it("steps in 15-minute intervals inside the requested window", async () => {
      const { service } = make(windowEvent());
      const slots = await service.getAvailableSlots("e-1", START, END);
      expect(starts(slots)).toEqual(["09:00", "09:15", "09:30", "09:45"]);
      expect(slots[0]).toMatchObject({
        startTime: "2026-06-02T09:00:00.000Z",
        endTime: "2026-06-02T09:30:00.000Z",
        remainingSeats: null,
        maxSeats: null,
        assignedCoach: null,
      });
    });

    it("drops slots that start within 2 minutes of now", async () => {
      const { service } = make(windowEvent());
      const slots = await service.getAvailableSlots(
        "e-1",
        new Date(NOW.getTime()),
        new Date(NOW.getTime() + 30 * MIN),
      );
      expect(starts(slots)).toEqual(["08:15"]); // 08:00 is now; 08:15 is the first slot beyond the 2-minute guard
    });

    it("drops slots that do not meet the minimum notice", async () => {
      const { service } = make(windowEvent({ minimumNoticeMinutes: 24 * 60 + 30 }));
      // Every slot is 25h or more away, so 24h30m of notice lets all four through.
      const slots = await service.getAvailableSlots("e-1", START, END);
      expect(starts(slots)).toEqual(["09:00", "09:15", "09:30", "09:45"]);
      // With 25h20m of notice, 09:00 (25h0m) and 09:15 (25h15m) are too soon; 09:30 (25h30m) is not.
      const strict = make(windowEvent({ minimumNoticeMinutes: 25 * 60 + 20 }));
      expect(starts(await strict.service.getAvailableSlots("e-1", START, END))).toEqual([
        "09:30",
        "09:45",
      ]);
    });

    it("clips the window to maxBookingWindowDays (UTC when no timezone is given)", async () => {
      const { service, repo } = make(windowEvent({ maxBookingWindowDays: 1 }));
      const farEnd = new Date("2026-06-05T00:00:00.000Z");
      const slots = await service.getAvailableSlots(
        "e-1",
        new Date("2026-06-02T22:00:00.000Z"),
        farEnd,
      );
      // today (June 1) + 1 day = end of June 2 UTC
      expect(starts(slots)).toEqual([
        "22:00",
        "22:15",
        "22:30",
        "22:45",
        "23:00",
        "23:15",
        "23:30",
        "23:45",
      ]);
      const batchEnd = (repo.findExceptionsForCoaches as jest.Mock).mock.calls[0][2] as Date;
      expect(batchEnd.getTime()).toBe(new Date("2026-06-02T23:59:59.999Z").getTime() + 1800 * 1000);
    });

    it("excludes a slot when no coach is free", async () => {
      const { service } = make(windowEvent(), {}, false);
      expect(await service.getAvailableSlots("e-1", START, END)).toEqual([]);
    });
  });

  describe("choosing which coaches to check", () => {
    const calls = (deps: { isCoachAvailable: jest.Mock }) =>
      deps.isCoachAvailable.mock.calls.map((c) => c[0]);

    it("round-robin checks coaches in order and stops at the first who is free", async () => {
      const { service, deps } = make(windowEvent());
      await service.getAvailableSlots("e-1", START, new Date(START.getTime() + 1));
      expect(calls(deps)).toEqual(["c-1"]);
    });

    it("round-robin falls through to the next coach when the first is busy", async () => {
      const { service, deps } = make(windowEvent());
      deps.isCoachAvailable.mockImplementation(async (id: string) => id === "c-2");
      const slots = await service.getAvailableSlots("e-1", START, new Date(START.getTime() + 1));
      expect(calls(deps)).toEqual(["c-1", "c-2"]);
      expect(slots).toHaveLength(1);
    });

    it("DIRECT assignment checks only the first coach — unless a preferred coach was requested", async () => {
      const direct = make(windowEvent({ assignmentStrategy: "DIRECT" }), {}, false);
      await direct.service.getAvailableSlots("e-1", START, new Date(START.getTime() + 1));
      expect(calls(direct.deps)).toEqual(["c-1"]);

      const preferred = make(windowEvent({ assignmentStrategy: "DIRECT" }), {}, false);
      await preferred.service.getAvailableSlots("e-1", START, new Date(START.getTime() + 1), "c-2");
      expect(calls(preferred.deps)).toEqual(["c-2"]);
    });
  });

  describe("what each availability check is given (so the loop makes no queries of its own)", () => {
    it("passes pre-fetched timezone, calendar, override, buffer and conflicts", async () => {
      const overrides = [
        { coachUserId: "c-1", dayOfWeek: 2, startTime: "10:00", endTime: "12:00" },
      ];
      const weekly = [{ userId: "c-1", dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }];
      const exceptions = [{ userId: "c-1", date: new Date("2026-06-02") }];
      const { service, deps } = make(windowEvent({ bufferAfterMinutes: 10 }), {
        findEventCoachOverrides: jest.fn().mockResolvedValue(overrides),
        findWeeklyForCoaches: jest.fn().mockResolvedValue(weekly),
        findExceptionsForCoaches: jest.fn().mockResolvedValue(exceptions),
      });
      await service.getAvailableSlots("e-1", START, new Date(START.getTime() + 1));
      const [userId, slotStart, slotEnd, options] = deps.isCoachAvailable.mock.calls[0];
      expect(userId).toBe("c-1");
      expect(slotStart).toEqual(START);
      expect(slotEnd).toEqual(new Date(START.getTime() + 30 * MIN));
      expect(options).toMatchObject({
        ignoreWeeklySchedule: false,
        weeklyOverride: [{ dayOfWeek: 2, startTime: "10:00", endTime: "12:00" }],
        bufferAfterMinutes: 10,
        timezone: "UTC",
        calendarData: { weekly, exceptions },
        prefetchedConflicts: [],
      });
      expect(options.eventId).toBeUndefined(); // shared-session overlap only applies to fixed slots
    });

    it("hands each coach only their own conflicts (own bookings, co-coached bookings and pinned slots)", async () => {
      const booking = (id: string, coachUserId: string, coCoachUserIds: string[]) => ({
        id,
        coachUserId,
        coCoachUserIds,
        eventId: "other",
        scheduleSlotId: null,
        startTime: new Date("2026-06-02T09:00:00.000Z"),
        endTime: new Date("2026-06-02T09:30:00.000Z"),
        event: { bufferAfterMinutes: 0 },
      });
      const { service, deps } = make(windowEvent(), {
        findConflictBookings: jest
          .fn()
          .mockResolvedValue([
            booking("b-own", "c-1", []),
            booking("b-co", "c-9", ["c-2"]),
            booking("b-stranger", "c-9", ["c-8"]),
          ]),
        findConflictSlots: jest.fn().mockResolvedValue([
          {
            id: "slot-pinned",
            startTime: new Date("2026-06-02T09:00:00.000Z"),
            endTime: new Date("2026-06-02T09:30:00.000Z"),
            eventId: "other",
            assignedCoachId: "c-2",
            event: { bufferAfterMinutes: null },
          },
        ]),
      });
      deps.isCoachAvailable.mockResolvedValue(false); // force every coach to be checked
      await service.getAvailableSlots("e-1", START, new Date(START.getTime() + 1));
      const conflictsFor = (id: string) =>
        (
          deps.isCoachAvailable.mock.calls.find((c) => c[0] === id)![3]
            .prefetchedConflicts as Array<{ id?: string; scheduleSlotId?: string }>
        ).map((c) => c.id ?? c.scheduleSlotId);
      expect(conflictsFor("c-1")).toEqual(["b-own"]);
      expect(conflictsFor("c-2")).toEqual(["b-co", "slot-pinned"]);
    });
  });

  describe("fixed-slot events", () => {
    it("makes none of the per-coach batch queries and tells the check to ignore weekly hours", async () => {
      const { service, repo, deps } = make(fixedEvent());
      const slots = await service.getAvailableSlots("e-1", START, END);
      for (const fn of [
        repo.findEventCoachOverrides,
        repo.findCoachTimezones,
        repo.findWeeklyForCoaches,
        repo.findExceptionsForCoaches,
        repo.findConflictBookings,
        repo.findConflictSlots,
      ]) {
        expect(fn).not.toHaveBeenCalled();
      }
      expect(slots).toHaveLength(1);
      const options = deps.isCoachAvailable.mock.calls[0][3];
      expect(options).toMatchObject({
        ignoreWeeklySchedule: true,
        eventId: "e-1",
        scheduleSlotId: "s-1",
      });
      expect(options).not.toHaveProperty("timezone");
    });

    it("reports seats left and the cap, using the slot's capacity before the event's", async () => {
      const { service } = make(fixedEvent({ scheduleSlots: [fixedSlot({ capacity: 3 })] }), {
        countActiveBookingsForSlot: jest.fn().mockResolvedValue(1),
      });
      const [slot] = await service.getAvailableSlots("e-1", START, END);
      expect(slot).toMatchObject({ scheduleSlotId: "s-1", maxSeats: 3, remainingSeats: 2 });
    });

    it("falls back to the event's cap, and reports unlimited as null", async () => {
      const capped = make(fixedEvent(), {
        countActiveBookingsForSlot: jest.fn().mockResolvedValue(2),
      });
      expect((await capped.service.getAvailableSlots("e-1", START, END))[0]).toMatchObject({
        maxSeats: 5,
        remainingSeats: 3,
      });
      const open = make(fixedEvent({ maxParticipantCount: null }));
      expect((await open.service.getAvailableSlots("e-1", START, END))[0]).toMatchObject({
        maxSeats: null,
        remainingSeats: null,
      });
    });

    it("hides a slot that is full", async () => {
      const { service } = make(fixedEvent({ scheduleSlots: [fixedSlot({ capacity: 2 })] }), {
        countActiveBookingsForSlot: jest.fn().mockResolvedValue(2),
      });
      expect(await service.getAvailableSlots("e-1", START, END)).toEqual([]);
    });

    it("checks only the assigned coach when the slot has one, and returns that coach", async () => {
      const assigned = { id: "c-2", firstName: "A", lastName: "B", avatarUrl: null };
      const { service, deps } = make(
        fixedEvent({
          scheduleSlots: [fixedSlot({ assignedCoachId: "c-2", assignedCoach: assigned })],
        }),
      );
      const [slot] = await service.getAvailableSlots("e-1", START, END);
      expect(deps.isCoachAvailable.mock.calls.map((c) => c[0])).toEqual(["c-2"]);
      expect(slot.assignedCoach).toEqual(assigned);
    });

    it("skips slots that start at or after the end of the window", async () => {
      const late = fixedSlot({
        id: "s-late",
        startTime: new Date("2026-06-02T10:00:00.000Z"),
        endTime: new Date("2026-06-02T10:30:00.000Z"),
      });
      const { service } = make(fixedEvent({ scheduleSlots: [fixedSlot(), late] }));
      expect(
        (await service.getAvailableSlots("e-1", START, END)).map((s) => s.scheduleSlotId),
      ).toEqual(["s-1"]);
    });

    describe("recurring series with a visibility limit", () => {
      const series = [
        fixedSlot({ id: "s-1", recurrenceGroupId: "g-1" }),
        fixedSlot({
          id: "s-2",
          recurrenceGroupId: "g-1",
          startTime: new Date("2026-06-02T09:30:00.000Z"),
          endTime: new Date("2026-06-02T10:00:00.000Z"),
        }),
        fixedSlot({
          id: "s-3",
          recurrenceGroupId: null,
          startTime: new Date("2026-06-02T09:45:00.000Z"),
          endTime: new Date("2026-06-02T10:15:00.000Z"),
        }),
      ];

      it("shows only the next N upcoming slots of the series, and always shows one-off slots", async () => {
        const { service, repo } = make(fixedEvent({ scheduleSlots: series }), {
          findRecurrenceVisibilityLimits: jest
            .fn()
            .mockResolvedValue([{ id: "g-1", recurrenceVisibilityLimit: 1 }]),
          findUpcomingSlotIdsInGroup: jest.fn().mockResolvedValue([{ id: "s-1" }]),
        });
        const slots = await service.getAvailableSlots(
          "e-1",
          START,
          new Date("2026-06-02T12:00:00.000Z"),
        );
        expect(slots.map((s) => s.scheduleSlotId)).toEqual(["s-1", "s-3"]);
        expect(repo.findRecurrenceVisibilityLimits).toHaveBeenCalledWith(["g-1"]);
        expect(repo.findUpcomingSlotIdsInGroup).toHaveBeenCalledWith("g-1", NOW, 1);
      });

      it("applies no restriction when the series has no limit", async () => {
        const { service, repo } = make(fixedEvent({ scheduleSlots: series }), {
          findRecurrenceVisibilityLimits: jest
            .fn()
            .mockResolvedValue([{ id: "g-1", recurrenceVisibilityLimit: null }]),
        });
        const slots = await service.getAvailableSlots(
          "e-1",
          START,
          new Date("2026-06-02T12:00:00.000Z"),
        );
        expect(slots).toHaveLength(3);
        expect(repo.findUpcomingSlotIdsInGroup).not.toHaveBeenCalled();
      });

      it("does not even look up series when no slot belongs to one", async () => {
        const { service, repo } = make(fixedEvent());
        await service.getAvailableSlots("e-1", START, END);
        expect(repo.findRecurrenceVisibilityLimits).not.toHaveBeenCalled();
      });
    });
  });
});

describe("endOfBookingWindowInTimezone", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW); // 2026-06-01T08:00Z
  });
  afterEach(() => jest.useRealTimers());

  it("is the last millisecond of the day, in the given timezone", () => {
    expect(endOfBookingWindowInTimezone("UTC", 0).toISOString()).toBe("2026-06-01T23:59:59.999Z");
    expect(endOfBookingWindowInTimezone("UTC", 2).toISOString()).toBe("2026-06-03T23:59:59.999Z");
    // 08:00Z is 04:00 on June 1 in New York (UTC-4), whose day ends at 03:59:59.999Z the next UTC day.
    expect(endOfBookingWindowInTimezone("America/New_York", 0).toISOString()).toBe(
      "2026-06-02T03:59:59.999Z",
    );
  });

  it("falls back to UTC arithmetic for an invalid timezone", () => {
    expect(endOfBookingWindowInTimezone("Not/AZone", 1).toISOString()).toBe(
      "2026-06-02T23:59:59.999Z",
    );
  });
});

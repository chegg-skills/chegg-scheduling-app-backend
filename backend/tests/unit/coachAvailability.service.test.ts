import { createCoachAvailabilityService } from "../../src/domain/availability/coachAvailability.service";
import type { CoachAvailabilityRepository } from "../../src/domain/availability/coachAvailability.repository";
import { toLocalAvailabilityInfo } from "../../src/domain/availability/availability.shared";

const HOUR = 60 * 60 * 1000;
// Monday 2026-06-01, 10:00–11:00 UTC. The coach's timezone is UTC in these tests.
const start = new Date(Date.UTC(2026, 5, 1, 10, 0));
const end = new Date(Date.UTC(2026, 5, 1, 11, 0));
const weekday = toLocalAvailabilityInfo(start, "UTC").dayOfWeek; // whatever the app's convention is

const workdayRow = { dayOfWeek: weekday, startTime: "09:00", endTime: "17:00" };
const fakeTx = { __fake: true } as never;

const makeRepo = (
  overrides: Partial<CoachAvailabilityRepository> = {},
): CoachAvailabilityRepository => ({
  findTimezone: jest.fn().mockResolvedValue({ timezone: "UTC" }),
  findWeekly: jest.fn().mockResolvedValue([workdayRow]),
  findExceptionsBetween: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const makeDeps = () => ({
  getCoachConflicts: jest.fn().mockResolvedValue([]),
  getEventCoachWeeklyAvailability: jest.fn().mockResolvedValue([]),
});

const make = (repo = makeRepo(), deps = makeDeps()) => ({
  service: createCoachAvailabilityService(repo, deps as never),
  repo,
  deps,
});

describe("createCoachAvailabilityService (fake repository + injected dependencies)", () => {
  describe("the verdict", () => {
    it("is available inside the weekly window", async () => {
      expect(await make().service.evaluateCoachAvailability("u-1", start, end)).toEqual({
        available: true,
        reason: null,
      });
    });

    it("is unavailable outside the weekly window", async () => {
      const repo = makeRepo({
        findWeekly: jest.fn().mockResolvedValue([{ ...workdayRow, startTime: "13:00" }]),
      });
      expect(await make(repo).service.evaluateCoachAvailability("u-1", start, end)).toMatchObject({
        available: false,
        reason: "outside_availability",
      });
    });

    it("is unavailable on a day with no weekly hours at all", async () => {
      const repo = makeRepo({ findWeekly: jest.fn().mockResolvedValue([]) });
      expect((await make(repo).service.evaluateCoachAvailability("u-1", start, end)).reason).toBe(
        "outside_availability",
      );
    });

    it("an all-day exception blocks the coach even inside weekly hours", async () => {
      const repo = makeRepo({
        findExceptionsBetween: jest
          .fn()
          .mockResolvedValue([
            {
              date: new Date("2026-06-01T00:00:00.000Z"),
              isUnavailable: true,
              startTime: null,
              endTime: null,
            },
          ]),
      });
      expect(await make(repo).service.evaluateCoachAvailability("u-1", start, end)).toMatchObject({
        available: false,
        reason: "exception_block",
      });
    });

    it("reports the first conflict and stops there", async () => {
      const deps = makeDeps();
      const conflict = { id: "b-1" };
      deps.getCoachConflicts.mockResolvedValue([conflict, { id: "b-2" }]);
      expect(
        await make(makeRepo(), deps).service.evaluateCoachAvailability("u-1", start, end),
      ).toEqual({
        available: false,
        reason: "conflict",
        conflict,
      });
    });

    it("treats a coach who cannot be found as an invalid-timezone case, not an error", async () => {
      const repo = makeRepo({ findTimezone: jest.fn().mockResolvedValue(null) });
      expect(await make(repo).service.evaluateCoachAvailability("u-1", start, end)).toMatchObject({
        available: false,
        reason: "invalid_timezone",
      });
    });

    it("treats an invalid stored timezone as unavailable, not a crash", async () => {
      const repo = makeRepo({
        findTimezone: jest.fn().mockResolvedValue({ timezone: "Not/AZone" }),
      });
      expect((await make(repo).service.evaluateCoachAvailability("u-1", start, end)).reason).toBe(
        "invalid_timezone",
      );
    });

    it("the buffer extends the end of the window that is checked", async () => {
      // Hours end at 11:30; a 1h session ending 11:00 fits, but with a 45-minute buffer it does not.
      const repo = makeRepo({
        findWeekly: jest.fn().mockResolvedValue([{ ...workdayRow, endTime: "11:30" }]),
      });
      const { service } = make(repo);
      expect((await service.evaluateCoachAvailability("u-1", start, end)).available).toBe(true);
      expect(
        (await service.evaluateCoachAvailability("u-1", start, end, { bufferAfterMinutes: 45 }))
          .available,
      ).toBe(false);
    });
  });

  describe("isCoachAvailable", () => {
    it("is just the boolean of the verdict", async () => {
      const { service } = make();
      expect(await service.isCoachAvailable("u-1", start, end)).toBe(true);
      const blocked = make(makeRepo({ findWeekly: jest.fn().mockResolvedValue([]) }));
      expect(await blocked.service.isCoachAvailable("u-1", start, end)).toBe(false);
    });
  });

  describe("which connection each query uses (the deadlock-sensitive part)", () => {
    it("reads timezone, weekly hours and exceptions on the caller's transaction", async () => {
      const { service, repo } = make();
      await service.evaluateCoachAvailability("u-1", start, end, { tx: fakeTx });
      expect((repo.findTimezone as jest.Mock).mock.calls[0][1]).toBe(fakeTx);
      expect((repo.findWeekly as jest.Mock).mock.calls[0][1]).toBe(fakeTx);
      expect((repo.findExceptionsBetween as jest.Mock).mock.calls[0][3]).toBe(fakeTx);
    });

    it("hands the whole options object (including tx) on to conflict detection", async () => {
      const { service, deps } = make();
      const options = {
        tx: fakeTx,
        eventId: "e-1",
        scheduleSlotId: "s-1",
        excludeBookingId: "b-9",
      };
      await service.evaluateCoachAvailability("u-1", start, end, options);
      expect(deps.getCoachConflicts).toHaveBeenCalledWith("u-1", start, end, options);
    });

    it("uses the default connection when no transaction is supplied", async () => {
      const { service, repo } = make();
      await service.evaluateCoachAvailability("u-1", start, end);
      expect((repo.findTimezone as jest.Mock).mock.calls[0][1]).toBeUndefined();
      expect((repo.findWeekly as jest.Mock).mock.calls[0][1]).toBeUndefined();
      expect((repo.findExceptionsBetween as jest.Mock).mock.calls[0][3]).toBeUndefined();
    });

    it("reads the per-event override WITHOUT a transaction — exactly two arguments, as before", async () => {
      // Existing behaviour that must not be "tidied" by accident: this one read runs on the
      // shared pool even when the rest of the evaluation is inside a transaction.
      const { service, deps } = make();
      await service.evaluateCoachAvailability("u-1", start, end, { tx: fakeTx, eventId: "e-1" });
      expect(deps.getEventCoachWeeklyAvailability).toHaveBeenCalledTimes(1);
      expect(deps.getEventCoachWeeklyAvailability.mock.calls[0]).toEqual(["e-1", "u-1"]);
    });

    it("looks for exceptions 48 hours either side of the (buffered) session", async () => {
      const { service, repo } = make();
      await service.evaluateCoachAvailability("u-1", start, end, { bufferAfterMinutes: 30 });
      const [, from, to] = (repo.findExceptionsBetween as jest.Mock).mock.calls[0];
      expect(from).toEqual(new Date(start.getTime() - 48 * HOUR));
      expect(to).toEqual(new Date(end.getTime() + 30 * 60 * 1000 + 48 * HOUR));
    });
  });

  describe("queries that are skipped when the caller already has the data", () => {
    it("skips the timezone lookup when a timezone is supplied", async () => {
      const { service, repo } = make();
      await service.evaluateCoachAvailability("u-1", start, end, { timezone: "UTC" });
      expect(repo.findTimezone).not.toHaveBeenCalled();
    });

    it("skips the weekly read for fixed-slot events (ignoreWeeklySchedule) but still reads exceptions", async () => {
      const { service, repo } = make();
      const result = await service.evaluateCoachAvailability("u-1", start, end, {
        ignoreWeeklySchedule: true,
      });
      expect(repo.findWeekly).not.toHaveBeenCalled();
      expect(repo.findExceptionsBetween).toHaveBeenCalledTimes(1);
      expect(result.available).toBe(true); // weekly hours are not consulted at all
    });

    it("skips both calendar reads when calendar data is supplied", async () => {
      const { service, repo } = make();
      await service.evaluateCoachAvailability("u-1", start, end, {
        calendarData: { weekly: [workdayRow] as never, exceptions: [] },
      });
      expect(repo.findWeekly).not.toHaveBeenCalled();
      expect(repo.findExceptionsBetween).not.toHaveBeenCalled();
    });

    it("skips conflict detection when pre-fetched conflicts are supplied", async () => {
      const { service, deps } = make();
      await service.evaluateCoachAvailability("u-1", start, end, { prefetchedConflicts: [] });
      expect(deps.getCoachConflicts).not.toHaveBeenCalled();
    });

    it("uses a supplied weekly override instead of fetching one, and it replaces the global hours", async () => {
      const { service, deps } = make();
      const narrow = [{ dayOfWeek: weekday, startTime: "13:00", endTime: "14:00" }];
      const result = await service.evaluateCoachAvailability("u-1", start, end, {
        eventId: "e-1",
        weeklyOverride: narrow,
      });
      expect(deps.getEventCoachWeeklyAvailability).not.toHaveBeenCalled();
      expect(result.reason).toBe("outside_availability");
    });

    it("does not fetch the event override for fixed-slot events or when there is no event", async () => {
      const a = make();
      await a.service.evaluateCoachAvailability("u-1", start, end, {
        eventId: "e-1",
        ignoreWeeklySchedule: true,
      });
      expect(a.deps.getEventCoachWeeklyAvailability).not.toHaveBeenCalled();
      const b = make();
      await b.service.evaluateCoachAvailability("u-1", start, end);
      expect(b.deps.getEventCoachWeeklyAvailability).not.toHaveBeenCalled();
    });

    it("a fetched event override takes priority over the coach's global hours", async () => {
      const deps = makeDeps();
      deps.getEventCoachWeeklyAvailability.mockResolvedValue([
        { dayOfWeek: weekday, startTime: "13:00", endTime: "14:00" },
      ]);
      const { service } = make(makeRepo(), deps);
      expect(
        (await service.evaluateCoachAvailability("u-1", start, end, { eventId: "e-1" })).reason,
      ).toBe("outside_availability");
    });
  });
});

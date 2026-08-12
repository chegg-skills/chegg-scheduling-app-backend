import { generateRecurrenceDates } from "../../src/domain/events/recurrence.service";
import { fromZonedWallClock, toZonedWallClock } from "../../src/shared/utils/date";

// Local wall-clock "HH:mm" of a UTC instant, as seen in `tz` — used to assert the
// series holds its local time even as the UTC offset changes across DST.
const localHM = (d: Date, tz: string): string =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);

const iso = (d: Date) => d.toISOString();

describe("generateRecurrenceDates", () => {
  describe("UTC anchor (default) — backward compatibility", () => {
    it("WEEKLY reproduces fixed 7-day interval addition", () => {
      const start = new Date("2026-06-01T09:30:00.000Z");
      const dates = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 3 });

      expect(dates.map(iso)).toEqual([
        "2026-06-01T09:30:00.000Z",
        "2026-06-08T09:30:00.000Z",
        "2026-06-15T09:30:00.000Z",
      ]);
    });

    it("preserves the exact start instant (incl. milliseconds) for occurrence 0", () => {
      const start = new Date("2026-06-01T09:30:00.123Z");
      const [first] = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 1 });
      expect(first.getTime()).toBe(start.getTime());
    });

    it("MONTHLY clamps to the last day of shorter months (Jan 31 → Feb 28)", () => {
      const start = new Date("2026-01-31T10:00:00.000Z");
      const dates = generateRecurrenceDates(start, { frequency: "MONTHLY", occurrences: 3 });

      expect(dates.map(iso)).toEqual([
        "2026-01-31T10:00:00.000Z",
        "2026-02-28T10:00:00.000Z", // clamped, not Mar 3 (matches date-fns addMonths)
        "2026-03-28T10:00:00.000Z", // advances from the clamped Feb 28 (same as old code)
      ]);
    });
  });

  describe("DST-observing timezone — keeps the same local time (the bug fix)", () => {
    const NY = "America/New_York";

    it("WEEKLY holds 10:00 local across the autumn fall-back (UTC 14→15)", () => {
      // 2026 US DST ends Sun Nov 1. Mon Oct 26 is EDT (-4); Mon Nov 2 is EST (-5).
      const start = new Date("2026-10-26T14:00:00.000Z"); // 10:00 EDT
      const dates = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 3 }, NY);

      expect(dates.map(iso)).toEqual([
        "2026-10-26T14:00:00.000Z", // 10:00 EDT
        "2026-11-02T15:00:00.000Z", // 10:00 EST — UTC shifted an hour
        "2026-11-09T15:00:00.000Z", // 10:00 EST
      ]);
      dates.forEach((d) => expect(localHM(d, NY)).toBe("10:00"));
    });

    it("WEEKLY holds 10:00 local across the spring-forward (UTC 15→14)", () => {
      // 2026 US DST starts Sun Mar 8. Mon Mar 2 is EST (-5); Mon Mar 9 is EDT (-4).
      const start = new Date("2026-03-02T15:00:00.000Z"); // 10:00 EST
      const dates = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 3 }, NY);

      expect(dates.map(iso)).toEqual([
        "2026-03-02T15:00:00.000Z", // 10:00 EST
        "2026-03-09T14:00:00.000Z", // 10:00 EDT — UTC shifted an hour
        "2026-03-16T14:00:00.000Z", // 10:00 EDT
      ]);
      dates.forEach((d) => expect(localHM(d, NY)).toBe("10:00"));
    });

    it("avoids the old fixed-interval drift (the occurrence after DST is NOT start+7d)", () => {
      const start = new Date("2026-10-26T14:00:00.000Z"); // 10:00 EDT
      const [, second] = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 2 }, NY);

      const naiveFixedInterval = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      // Old behavior would have produced 14:00Z (= 9:00 EST, an hour early).
      expect(iso(naiveFixedInterval)).toBe("2026-11-02T14:00:00.000Z");
      expect(localHM(naiveFixedInterval, NY)).toBe("09:00"); // the bug
      expect(second.getTime()).not.toBe(naiveFixedInterval.getTime());
      expect(localHM(second, NY)).toBe("10:00"); // the fix
    });

    it("BI_WEEKLY and MONTHLY also hold their local time across DST", () => {
      const start = new Date("2026-10-19T14:00:00.000Z"); // Mon Oct 19, 10:00 EDT
      const biweekly = generateRecurrenceDates(start, { frequency: "BI_WEEKLY", occurrences: 2 }, NY);
      biweekly.forEach((d) => expect(localHM(d, NY)).toBe("10:00"));

      const monthly = generateRecurrenceDates(
        new Date("2026-10-15T14:00:00.000Z"), // Oct 15, 10:00 EDT
        { frequency: "MONTHLY", occurrences: 2 },
        NY,
      );
      monthly.forEach((d) => expect(localHM(d, NY)).toBe("10:00"));
    });
  });
});

describe("zoned wall-clock utils", () => {
  it("round-trips a UTC instant through a DST-observing zone", () => {
    const utc = new Date("2026-11-02T15:00:00.000Z"); // 10:00 EST
    const floating = toZonedWallClock(utc, "America/New_York");
    expect(floating.toISOString()).toBe("2026-11-02T10:00:00.000Z"); // wall clock, floated to UTC
    expect(fromZonedWallClock(floating, "America/New_York").getTime()).toBe(utc.getTime());
  });

  it("is a no-op for the UTC zone", () => {
    const utc = new Date("2026-06-01T09:30:00.000Z");
    expect(toZonedWallClock(utc, "UTC").getTime()).toBe(utc.getTime());
    expect(fromZonedWallClock(utc, "UTC").getTime()).toBe(utc.getTime());
  });
});

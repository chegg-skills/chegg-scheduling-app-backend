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

    it("TWICE_A_MONTH holds local time across a DST boundary", () => {
      // 10:00 New York, +14 days across the Nov 1 fall-back.
      const start = fromZonedWallClock(new Date("2026-10-26T10:00:00.000Z"), NY);
      const dates = generateRecurrenceDates(start, { frequency: "TWICE_A_MONTH", occurrences: 3 }, NY);
      dates.forEach((d) => expect(localHM(d, NY)).toBe("10:00"));
    });

    it("holds local time across a SOUTHERN-hemisphere spring-forward (Sydney, Oct)", () => {
      // Australia/Sydney springs forward Sun Oct 4 2026 — reversed seasons, east of UTC.
      const start = fromZonedWallClock(new Date("2026-09-27T10:00:00.000Z"), "Australia/Sydney");
      const dates = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 4 }, "Australia/Sydney");
      dates.forEach((d) => expect(localHM(d, "Australia/Sydney")).toBe("10:00"));
    });

    it("holds local time across a HALF-HOUR DST shift (Lord Howe, Oct)", () => {
      // Australia/Lord_Howe shifts +10:30 → +11:00 (a 30-minute jump) on Sun Oct 4 2026.
      const start = fromZonedWallClock(new Date("2026-09-27T10:00:00.000Z"), "Australia/Lord_Howe");
      const dates = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 3 }, "Australia/Lord_Howe");
      dates.forEach((d) => expect(localHM(d, "Australia/Lord_Howe")).toBe("10:00"));
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

  describe("invalid timezone → UTC fallback (no throw)", () => {
    const utc = new Date("2026-06-01T09:30:00.000Z");

    it.each(["", "Not/AZone", "GMT+5:30"])("falls back to UTC for %p", (badTz) => {
      // UTC wall clock == the instant itself, in both directions.
      expect(toZonedWallClock(utc, badTz).getTime()).toBe(utc.getTime());
      expect(fromZonedWallClock(utc, badTz).getTime()).toBe(utc.getTime());
    });

    it("makes generateRecurrenceDates degrade to the UTC (fixed-interval) output", () => {
      const start = new Date("2026-06-01T09:30:00.000Z");
      const bad = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 3 }, "Not/AZone");
      const utcAnchored = generateRecurrenceDates(start, { frequency: "WEEKLY", occurrences: 3 }, "UTC");
      expect(bad.map(iso)).toEqual(utcAnchored.map(iso));
    });
  });

  describe("DST gap / ambiguous-hour resolution", () => {
    const NY = "America/New_York";
    // A "floating" Date whose UTC fields are the intended local wall clock.
    const wallClock = (isoLocal: string) => new Date(`${isoLocal}.000Z`);

    it("rolls a non-existent (spring-forward gap) local time forward past the gap", () => {
      // 2026 US DST starts 02:00 Sun Mar 8 → 03:00; 02:30 does not exist that day.
      const resolved = fromZonedWallClock(wallClock("2026-03-08T02:30:00"), NY);
      expect(resolved.toISOString()).toBe("2026-03-08T07:30:00.000Z"); // 03:30 EDT (forward)
      expect(localHM(resolved, NY)).toBe("03:30");
    });

    it("rolls the spring-forward gap forward for an east-of-UTC zone too (Berlin)", () => {
      // 2026 EU DST starts 02:00 Sun Mar 29 → 03:00; 02:30 does not exist. This is
      // the case a west-only algorithm gets wrong (it would roll backward to 01:30).
      const resolved = fromZonedWallClock(wallClock("2026-03-29T02:30:00"), "Europe/Berlin");
      expect(resolved.toISOString()).toBe("2026-03-29T01:30:00.000Z"); // 03:30 CEST (forward)
      expect(localHM(resolved, "Europe/Berlin")).toBe("03:30");
    });

    it("resolves an ambiguous (fall-back) local time to the earlier instant", () => {
      // 2026 US DST ends 02:00 Sun Nov 1 → 01:00; 01:30 occurs twice.
      const resolved = fromZonedWallClock(wallClock("2026-11-01T01:30:00"), NY);
      expect(resolved.toISOString()).toBe("2026-11-01T05:30:00.000Z"); // 01:30 EDT (the earlier one)
      expect(localHM(resolved, NY)).toBe("01:30");
    });

    it("rolls the spring-forward gap forward for a southern-hemisphere zone (Sydney)", () => {
      // Australia/Sydney springs forward 02:00 → 03:00 on Sun Oct 4 2026; 02:30 does not exist.
      const resolved = fromZonedWallClock(wallClock("2026-10-04T02:30:00"), "Australia/Sydney");
      expect(resolved.toISOString()).toBe("2026-10-03T16:30:00.000Z"); // 03:30 AEDT (forward)
      expect(localHM(resolved, "Australia/Sydney")).toBe("03:30");
    });

    it("rolls a half-hour DST gap forward (Lord Howe)", () => {
      // Australia/Lord_Howe jumps 02:00 → 02:30 (30 min) on Sun Oct 4 2026; 02:15 does not exist.
      const resolved = fromZonedWallClock(wallClock("2026-10-04T02:15:00"), "Australia/Lord_Howe");
      expect(resolved.toISOString()).toBe("2026-10-03T15:45:00.000Z"); // 02:45 (forward past the 30-min gap)
      expect(localHM(resolved, "Australia/Lord_Howe")).toBe("02:45");
    });

    it("resolves a European fall-back overlap deterministically (Berlin)", () => {
      // 02:30 occurs twice on Sun Oct 25 2026; resolves to a single stable instant, local 02:30.
      const resolved = fromZonedWallClock(wallClock("2026-10-25T02:30:00"), "Europe/Berlin");
      expect(resolved.toISOString()).toBe("2026-10-25T01:30:00.000Z");
      expect(localHM(resolved, "Europe/Berlin")).toBe("02:30");
    });
  });
});

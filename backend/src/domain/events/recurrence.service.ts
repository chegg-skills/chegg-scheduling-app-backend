import { fromZonedWallClock, toZonedWallClock } from "../../shared/utils/date";

export type RecurrenceFrequency =
  | "WEEKLY"
  | "BI_WEEKLY"
  | "MONTHLY"
  | "TWICE_A_MONTH"
  | "THRICE_A_WEEK";

/** All supported recurrence cadences — used to guard against stale/unknown values. */
export const RECURRENCE_FREQUENCIES: readonly RecurrenceFrequency[] = [
  "WEEKLY",
  "BI_WEEKLY",
  "MONTHLY",
  "TWICE_A_MONTH",
  "THRICE_A_WEEK",
];

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  occurrences: number; // Max number of slots to generate
}

/**
 * Advances a "floating" wall-clock Date (see `toZonedWallClock`) by one interval
 * for the given frequency, keeping the same local time-of-day.
 *
 * Advancement uses `setUTC*` on the floating date rather than `date-fns`
 * (whose add* helpers use the runtime's local timezone), so a series shifts by
 * whole calendar days/months regardless of the server timezone. The caller
 * converts the result back to a real UTC instant with `fromZonedWallClock`, so
 * the occurrence lands on the same wall-clock time even across a DST change.
 *
 * @param floating   - Floating wall-clock Date (its UTC fields = local components).
 * @param frequency  - Recurrence cadence.
 * @param index      - 0-based occurrence index (only THRICE_A_WEEK varies by it).
 */
export const advanceRecurrenceFloating = (
  floating: Date,
  frequency: RecurrenceFrequency,
  index: number,
): Date => {
  const next = new Date(floating);
  switch (frequency) {
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "BI_WEEKLY":
      next.setUTCDate(next.getUTCDate() + 14);
      break;
    case "MONTHLY": {
      // Advance one calendar month, clamping to the last day when the target
      // month is shorter (Jan 31 → Feb 28) — matches date-fns `addMonths` and
      // avoids setUTCMonth's overflow (Jan 31 + 1mo → Mar 3).
      const day = next.getUTCDate();
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + 1);
      const lastDayOfMonth = new Date(
        Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
      ).getUTCDate();
      next.setUTCDate(Math.min(day, lastDayOfMonth));
      break;
    }
    case "TWICE_A_MONTH":
      // Simple interpretation: every 14 days.
      next.setUTCDate(next.getUTCDate() + 14);
      break;
    case "THRICE_A_WEEK":
      // Alternate +2, +2, +3 days to complete a week (3 sessions per 7 days).
      next.setUTCDate(next.getUTCDate() + (index % 3 === 2 ? 3 : 2));
      break;
  }
  return next;
};

/**
 * Generates the UTC start instants for a recurring series, anchored to a local
 * wall-clock time in `timezone`. Each occurrence keeps the same local time-of-day
 * as `startDate`, so the UTC instant automatically absorbs DST offset changes
 * (e.g. "Every Monday 10 AM New York" stays 10 AM after the November DST switch).
 *
 * With `timezone === "UTC"` (the default, and the value stored for pre-existing
 * series) UTC has no DST, so the output is identical to fixed-interval addition.
 *
 * @param startDate - First occurrence (a real UTC instant); preserved exactly.
 * @param rule      - Frequency + number of occurrences.
 * @param timezone  - IANA anchor timezone (defaults to "UTC").
 */
export function generateRecurrenceDates(
  startDate: Date,
  rule: RecurrenceRule,
  timezone = "UTC",
): Date[] {
  const dates: Date[] = [];
  // The series' anchor: the first occurrence's local wall-clock in `timezone`.
  let floating = toZonedWallClock(startDate, timezone);
  const cutoffYear = new Date().getUTCFullYear() + 2;

  for (let i = 0; i < rule.occurrences; i++) {
    // Preserve the caller's exact startDate for occurrence 0 (incl. sub-second
    // precision); derive the rest from the DST-stable wall clock.
    dates.push(i === 0 ? new Date(startDate) : fromZonedWallClock(floating, timezone));

    floating = advanceRecurrenceFloating(floating, rule.frequency, i);

    // Safety cap: never generate dates absurdly far in the future.
    if (floating.getUTCFullYear() > cutoffYear) break;
  }

  return dates;
}

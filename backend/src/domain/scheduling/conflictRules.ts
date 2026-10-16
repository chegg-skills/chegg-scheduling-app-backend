import type { Prisma } from "@prisma/client";

/**
 * Pure conflict-filtering rules: no database, no I/O, no imports from other domains.
 * (The query that fetches the candidate bookings lives in availabilityConflict.service.)
 */

export type BookingWithEventBuffer = Prisma.BookingGetPayload<{
  include: {
    event: true;
  };
}>;

/**
 * Pure in-memory equivalent of getCoachConflicts' filter step.
 * Used by getAvailableSlots when conflicts are pre-fetched for the full date
 * range to avoid firing a DB query per slot iteration.
 */
export function filterConflictsForSlot(
  allConflicts: BookingWithEventBuffer[],
  startTime: Date,
  effectiveEndTime: Date,
  options: { eventId?: string; scheduleSlotId?: string | null } = {},
): BookingWithEventBuffer[] {
  const lookbackStart = new Date(startTime.getTime() - 120 * 60 * 1000);

  return allConflicts.filter((b) => {
    // Window pre-filter (mirrors the DB query range)
    if (!(b.startTime < effectiveEndTime && b.endTime > lookbackStart)) return false;

    // Same-session exclusion (mirrors buildSameSessionExclusion)
    if (options.eventId) {
      if (options.scheduleSlotId) {
        if (b.scheduleSlotId === options.scheduleSlotId) return false;
      } else {
        if (
          b.eventId === options.eventId &&
          b.startTime.getTime() === startTime.getTime() &&
          b.endTime.getTime() === effectiveEndTime.getTime()
        ) {
          return false;
        }
      }
    }

    // True overlap check (mirrors the .filter() in getCoachConflicts)
    const effectiveBookingEnd = new Date(
      b.endTime.getTime() + (b.event.bufferAfterMinutes ?? 0) * 60_000,
    );
    return startTime < effectiveBookingEnd && b.startTime < effectiveEndTime;
  });
}

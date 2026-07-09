import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { buildSameSessionExclusion, type AvailabilityClient } from "./availability.shared";

/**
 * Service responsible for determining if a host has scheduling conflicts.
 * Encapsulates the logic for "Same Booking" overrides and capacity-aware conflicts.
 */

export type BookingWithEventBuffer = Prisma.BookingGetPayload<{
  include: {
    event: true;
  };
}>;

export const getCoachConflicts = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  options: {
    eventId?: string;
    scheduleSlotId?: string | null;
    /** Excludes this booking's own record — used when rechecking availability
     * for the booking currently being rescheduled, so its own prior time slot
     * doesn't count as a conflict against itself. */
    excludeBookingId?: string;
    tx?: AvailabilityClient;
  } = {},
): Promise<BookingWithEventBuffer[]> => {
  const client = options.tx || prisma;

  // 1. Build the "Same Session Exclusion" to allow overlapping bookings for the same slot/event
  const sameSessionExclusion = buildSameSessionExclusion(startTime, endTime, options);

  // 2. Query for any potential conflicting bookings in a slightly wider window
  // to account for possibly large buffers on existing bookings.
  // We assume buffers won't exceed 120 minutes for safety.
  const lookbackStartTime = new Date(startTime.getTime() - 120 * 60 * 1000);

  const bookings = (await client.booking.findMany({
    where: {
      OR: [{ coachUserId: userId }, { coCoachUserIds: { has: userId } }],
      status: { in: ["CONFIRMED", "PENDING"] },
      ...(options.excludeBookingId ? { id: { not: options.excludeBookingId } } : {}),
      AND: [
        {
          startTime: { lt: endTime },
          endTime: { gt: lookbackStartTime },
        },
        ...(sameSessionExclusion ? [sameSessionExclusion] : []),
      ],
    },
    include: {
      event: true,
    },
  })) as BookingWithEventBuffer[];

  // 3. Also check fixed slot assignments — a coach assigned to a slot is hard-blocked
  // for that time even before any student has booked (no Booking record exists yet).
  const assignedSlots = await client.eventScheduleSlot.findMany({
    where: {
      assignedCoachId: userId,
      isActive: true,
      isCancelled: false,
      startTime: { lt: endTime },
      endTime: { gt: lookbackStartTime },
      ...(options.scheduleSlotId ? { NOT: { id: options.scheduleSlotId } } : {}),
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      eventId: true,
      event: { select: { bufferAfterMinutes: true } },
    },
  });

  // Shape slot assignments to match the fields callers need for overlap detection.
  const slotConflicts = assignedSlots.map((s) => ({
    startTime: s.startTime,
    endTime: s.endTime,
    scheduleSlotId: s.id,
    eventId: s.eventId,
    event: { bufferAfterMinutes: s.event?.bufferAfterMinutes ?? null },
  })) as unknown as BookingWithEventBuffer[];

  // 4. Filter for true "effective" overlaps (Meeting + Buffer)
  // A conflict occurs if the new meeting's [startTime, endTime]
  // overlaps with an existing meeting's [startTime, endTime + buffer]
  return [...bookings, ...slotConflicts].filter((booking) => {
    const effectiveEndTime = new Date(
      booking.endTime.getTime() + (booking.event.bufferAfterMinutes ?? 0) * 60 * 1000,
    );

    // Standard overlap check: current.start < other.end && other.start < current.end
    return startTime < effectiveEndTime && booking.startTime < endTime;
  });
};

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

/**
 * Determines if a conflict is blocking based on session capacity rules.
 */
export const isConflictBlocking = (
  conflicts: BookingWithEventBuffer[],
  currentEventId?: string,
): boolean => {
  if (conflicts.length === 0) return false;

  // A conflict is blocking if:
  // 1. It belongs to a different event (exclusive booking).
  // 2. It belongs to the same event but the event is in a mode that doesn't allow shared overlaps.
  // 3. The session is at capacity (handled at the booking service level, but here we check for simple presence).

  // For most cases, any conflict is blocking unless specifically exempted.
  return conflicts.length > 0;
};

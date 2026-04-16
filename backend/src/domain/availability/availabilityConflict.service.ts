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

export const getHostConflicts = async (
  userId: string,
  startTime: Date,
  endTime: Date,
  options: {
    eventId?: string;
    scheduleSlotId?: string | null;
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
      hostUserId: userId,
      status: { in: ["CONFIRMED", "PENDING"] },
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

  // 3. Filter for true "effective" overlaps (Meeting + Buffer)
  // A conflict occurs if the new meeting's [startTime, endTime]
  // overlaps with an existing meeting's [startTime, endTime + buffer]
  return bookings.filter((booking) => {
    const effectiveEndTime = new Date(
      booking.endTime.getTime() + (booking.event.bufferAfterMinutes ?? 0) * 60 * 1000,
    );

    // Standard overlap check: current.start < other.end && other.start < current.end
    return startTime < effectiveEndTime && booking.startTime < endTime;
  });
};

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

import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";
import type { BookingWithEventBuffer } from "../scheduling/conflictRules";

const assignedSlotSelect = {
  id: true,
  startTime: true,
  endTime: true,
  eventId: true,
  event: { select: { bufferAfterMinutes: true } },
} satisfies Prisma.EventScheduleSlotSelect;

export type AssignedSlotRow = Prisma.EventScheduleSlotGetPayload<{
  select: typeof assignedSlotSelect;
}>;

/**
 * Thin reads for conflict detection. Every `where` is built by the service; `tx` is the
 * caller's transaction client when there is one (this runs inside booking transactions).
 */
export interface AvailabilityConflictRepository {
  /** Bookings (with their event, for the buffer) matching `where`. */
  findBookingsWithEvent(
    where: Prisma.BookingWhereInput,
    tx?: DbClient,
  ): Promise<BookingWithEventBuffer[]>;
  /** Fixed-slot assignments matching `where`: a coach assigned to a slot is hard-blocked. */
  findAssignedSlots(
    where: Prisma.EventScheduleSlotWhereInput,
    tx?: DbClient,
  ): Promise<AssignedSlotRow[]>;
}

export const createAvailabilityConflictRepo = (
  db: DbClient = prisma,
): AvailabilityConflictRepository => ({
  findBookingsWithEvent: async (where, tx) =>
    (await (tx ?? db).booking.findMany({
      where,
      include: {
        event: true,
      },
    })) as BookingWithEventBuffer[],

  findAssignedSlots: (where, tx) =>
    (tx ?? db).eventScheduleSlot.findMany({
      where,
      select: assignedSlotSelect,
    }),
});

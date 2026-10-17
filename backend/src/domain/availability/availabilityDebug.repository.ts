import type { Prisma } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";
import type { BookingWithEventBuffer } from "../scheduling/conflictRules";
import {
  createAvailabilitySlotsRepo,
  type AvailabilitySlotsRepository,
} from "./availabilitySlots.repository";
import {
  debugConflictSlotSelect,
  debugEventInclude,
  type DebugConflictSlotRow,
  type DebugEventRecord,
} from "./availabilityDebug.shared";

/**
 * The debug report deliberately mirrors slot listing, so the six reads that are identical to
 * slot listing's are shared with it (same implementation, not a copy that could drift). The
 * four below differ: they read coach names, exclude a booking being rescheduled, include the
 * conflicting event's name, and load a single calendar day.
 */
type SharedWithSlotListing = Pick<
  AvailabilitySlotsRepository,
  | "findWeeklyForCoaches"
  | "findExceptionsForCoaches"
  | "findEventCoachOverrides"
  | "countActiveBookingsForSlot"
  | "findRecurrenceVisibilityLimits"
  | "findUpcomingSlotIdsInGroup"
>;

export interface AvailabilityDebugRepository extends SharedWithSlotListing {
  /** The event with its active coaches and the active schedule slots in [dayStart, dayEnd). */
  findEventForDay(
    eventId: string,
    dayStart: Date,
    dayEnd: Date,
    tx?: DbClient,
  ): Promise<DebugEventRecord | null>;
  findCoachProfiles(
    coachIds: string[],
    tx?: DbClient,
  ): Promise<Array<{ id: string; firstName: string; lastName: string; timezone: string }>>;
  /** Pending/confirmed bookings (with their event) that could clash; optionally ignoring one booking. */
  findConflictBookings(
    params: {
      coachIds: string[];
      lookbackStart: Date;
      rangeEnd: Date;
      excludeBookingId?: string;
    },
    tx?: DbClient,
  ): Promise<BookingWithEventBuffer[]>;
  findConflictSlots(
    coachIds: string[],
    lookbackStart: Date,
    rangeEnd: Date,
    tx?: DbClient,
  ): Promise<DebugConflictSlotRow[]>;
}

export const createAvailabilityDebugRepo = (db: DbClient = prisma): AvailabilityDebugRepository => {
  const slots = createAvailabilitySlotsRepo(db);
  return {
    findWeeklyForCoaches: slots.findWeeklyForCoaches,
    findExceptionsForCoaches: slots.findExceptionsForCoaches,
    findEventCoachOverrides: slots.findEventCoachOverrides,
    countActiveBookingsForSlot: slots.countActiveBookingsForSlot,
    findRecurrenceVisibilityLimits: slots.findRecurrenceVisibilityLimits,
    findUpcomingSlotIdsInGroup: slots.findUpcomingSlotIdsInGroup,

    findEventForDay: (eventId, dayStart, dayEnd, tx) =>
      (tx ?? db).event.findUnique({
        where: { id: eventId },
        include: {
          ...debugEventInclude,
          scheduleSlots: {
            where: {
              isActive: true,
              startTime: { gte: dayStart, lt: dayEnd },
            },
            include: {
              assignedCoach: { select: { id: true, firstName: true, lastName: true } },
            } as Prisma.EventScheduleSlotInclude,
            orderBy: { startTime: "asc" },
          },
        },
      }) as Promise<DebugEventRecord | null>,

    findCoachProfiles: (coachIds, tx) =>
      (tx ?? db).user.findMany({
        where: { id: { in: coachIds } },
        select: { id: true, firstName: true, lastName: true, timezone: true },
      }),

    findConflictBookings: ({ coachIds, lookbackStart, rangeEnd, excludeBookingId }, tx) =>
      (tx ?? db).booking.findMany({
        where: {
          OR: [{ coachUserId: { in: coachIds } }, { coCoachUserIds: { hasSome: coachIds } }],
          status: { in: ["CONFIRMED", "PENDING"] },
          ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
          startTime: { lt: rangeEnd },
          endTime: { gt: lookbackStart },
        },
        include: { event: true },
      }) as Promise<BookingWithEventBuffer[]>,

    findConflictSlots: (coachIds, lookbackStart, rangeEnd, tx) =>
      (tx ?? db).eventScheduleSlot.findMany({
        where: {
          assignedCoachId: { in: coachIds },
          isActive: true,
          isCancelled: false,
          startTime: { lt: rangeEnd },
          endTime: { gt: lookbackStart },
        },
        select: debugConflictSlotSelect,
      }),
  };
};

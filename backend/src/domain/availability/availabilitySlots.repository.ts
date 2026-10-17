import type {
  EventCoachWeeklyAvailability,
  UserAvailabilityException,
  UserWeeklyAvailability,
} from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";
import type { BookingWithEventBuffer } from "../scheduling/conflictRules";
import {
  conflictSlotSelect,
  slotAvailabilityEventInclude,
  slotAvailabilityScheduleSlotInclude,
  type AvailabilityEvent,
  type ConflictSlotRow,
} from "./availabilitySlots.shared";

/**
 * The reads behind slot listing. `getAvailableSlots` does its own batching: it fetches
 * everything per coach once up front so the slot loop runs in memory, which is why
 * these are "for a set of coaches" queries rather than one query per slot.
 */
export interface AvailabilitySlotsRepository {
  /** The event with its active coaches and the active schedule slots inside [from, to]. */
  findEventForSlots(
    eventId: string,
    from: Date,
    to: Date,
    tx?: DbClient,
  ): Promise<AvailabilityEvent | null>;
  findEventCoachOverrides(
    eventId: string,
    coachIds: string[],
    tx?: DbClient,
  ): Promise<EventCoachWeeklyAvailability[]>;
  findCoachTimezones(
    coachIds: string[],
    tx?: DbClient,
  ): Promise<Array<{ id: string; timezone: string }>>;
  findWeeklyForCoaches(coachIds: string[], tx?: DbClient): Promise<UserWeeklyAvailability[]>;
  findExceptionsForCoaches(
    coachIds: string[],
    from: Date,
    to: Date,
    tx?: DbClient,
  ): Promise<UserAvailabilityException[]>;
  /** Pending/confirmed bookings (with their event) that could clash with any slot in the range. */
  findConflictBookings(
    coachIds: string[],
    lookbackStart: Date,
    rangeEnd: Date,
    tx?: DbClient,
  ): Promise<BookingWithEventBuffer[]>;
  /** Fixed-slot assignments that block a coach in the range. */
  findConflictSlots(
    coachIds: string[],
    lookbackStart: Date,
    rangeEnd: Date,
    tx?: DbClient,
  ): Promise<ConflictSlotRow[]>;
  countActiveBookingsForSlot(scheduleSlotId: string, tx?: DbClient): Promise<number>;
  findRecurrenceVisibilityLimits(
    groupIds: string[],
    tx?: DbClient,
  ): Promise<Array<{ id: string; recurrenceVisibilityLimit: number | null }>>;
  findUpcomingSlotIdsInGroup(
    groupId: string,
    now: Date,
    limit: number,
    tx?: DbClient,
  ): Promise<Array<{ id: string }>>;
}

export const createAvailabilitySlotsRepo = (
  db: DbClient = prisma,
): AvailabilitySlotsRepository => ({
  findEventForSlots: (eventId, from, to, tx) =>
    (tx ?? db).event.findUnique({
      where: { id: eventId },
      include: {
        ...slotAvailabilityEventInclude,
        scheduleSlots: {
          where: {
            isActive: true,
            startTime: {
              gte: from,
              lte: to,
            },
          },
          include: slotAvailabilityScheduleSlotInclude,
          orderBy: { startTime: "asc" },
        },
      },
    }),

  findEventCoachOverrides: (eventId, coachIds, tx) =>
    (tx ?? db).eventCoachWeeklyAvailability.findMany({
      where: { eventId, coachUserId: { in: coachIds } },
    }),

  findCoachTimezones: (coachIds, tx) =>
    (tx ?? db).user.findMany({
      where: { id: { in: coachIds } },
      select: { id: true, timezone: true },
    }),

  findWeeklyForCoaches: (coachIds, tx) =>
    (tx ?? db).userWeeklyAvailability.findMany({ where: { userId: { in: coachIds } } }),

  findExceptionsForCoaches: (coachIds, from, to, tx) =>
    (tx ?? db).userAvailabilityException.findMany({
      where: { userId: { in: coachIds }, date: { gte: from, lte: to } },
    }),

  findConflictBookings: (coachIds, lookbackStart, rangeEnd, tx) =>
    (tx ?? db).booking.findMany({
      where: {
        OR: [{ coachUserId: { in: coachIds } }, { coCoachUserIds: { hasSome: coachIds } }],
        status: { in: ["CONFIRMED", "PENDING"] },
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
      select: conflictSlotSelect,
    }),

  countActiveBookingsForSlot: (scheduleSlotId, tx) =>
    (tx ?? db).booking.count({
      where: { scheduleSlotId, status: { not: "CANCELLED" } },
    }),

  findRecurrenceVisibilityLimits: (groupIds, tx) =>
    (tx ?? db).recurrenceGroup.findMany({
      where: { id: { in: groupIds } },
      select: { id: true, recurrenceVisibilityLimit: true },
    }),

  findUpcomingSlotIdsInGroup: (groupId, now, limit, tx) =>
    (tx ?? db).eventScheduleSlot.findMany({
      where: {
        recurrenceGroupId: groupId,
        startTime: { gte: now },
        isCancelled: false,
        isActive: true,
      },
      orderBy: { startTime: "asc" },
      take: limit,
      select: { id: true },
    }),
});

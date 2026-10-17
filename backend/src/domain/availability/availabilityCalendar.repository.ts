import type {
  EventCoachWeeklyAvailability,
  Prisma,
  UserAvailabilityException,
  UserWeeklyAvailability,
} from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import { runBatch, type DbClient } from "../../shared/db/repository";

export type WeeklySlotInput = { dayOfWeek: number; startTime: string; endTime: string };

export interface AvailabilityCalendarRepository {
  /** A user's weekly hours, ordered for display. */
  listWeekly(userId: string, tx?: DbClient): Promise<UserWeeklyAvailability[]>;
  /** A user's weekly hours, unordered (used for availability evaluation). */
  findWeekly(userId: string, tx?: DbClient): Promise<UserWeeklyAvailability[]>;
  /** Atomically replaces a user's weekly hours. */
  replaceWeekly(userId: string, slots: WeeklySlotInput[], tx?: DbClient): Promise<void>;

  listExceptions(userId: string, tx?: DbClient): Promise<UserAvailabilityException[]>;
  findExceptionsBetween(
    userId: string,
    from: Date,
    to: Date,
    tx?: DbClient,
  ): Promise<UserAvailabilityException[]>;
  createException(
    data: Prisma.UserAvailabilityExceptionUncheckedCreateInput,
    tx?: DbClient,
  ): Promise<UserAvailabilityException>;
  /** Deletes one exception owned by `userId`; rejects with Prisma P2025 when there is none. */
  deleteException(id: string, userId: string, tx?: DbClient): Promise<UserAvailabilityException>;

  listEventCoachWeekly(
    eventId: string,
    coachUserId: string,
    tx?: DbClient,
  ): Promise<EventCoachWeeklyAvailability[]>;
  /** Atomically replaces a coach's event-specific weekly override. */
  replaceEventCoachWeekly(
    eventId: string,
    coachUserId: string,
    slots: WeeklySlotInput[],
    tx?: DbClient,
  ): Promise<void>;
}

export const createAvailabilityCalendarRepo = (
  db: DbClient = prisma,
): AvailabilityCalendarRepository => ({
  listWeekly: (userId, tx) =>
    (tx ?? db).userWeeklyAvailability.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),

  findWeekly: (userId, tx) => (tx ?? db).userWeeklyAvailability.findMany({ where: { userId } }),

  replaceWeekly: (userId, slots, tx) => {
    const client = tx ?? db;
    return runBatch(client, [
      client.userWeeklyAvailability.deleteMany({ where: { userId } }),
      client.userWeeklyAvailability.createMany({
        data: slots.map((slot) => ({ ...slot, userId })),
      }),
    ]);
  },

  listExceptions: (userId, tx) =>
    (tx ?? db).userAvailabilityException.findMany({
      where: { userId },
      orderBy: [{ date: "asc" }],
    }),

  findExceptionsBetween: (userId, from, to, tx) =>
    (tx ?? db).userAvailabilityException.findMany({
      where: {
        userId,
        date: {
          gte: from,
          lte: to,
        },
      },
    }),

  createException: (data, tx) => (tx ?? db).userAvailabilityException.create({ data }),

  deleteException: (id, userId, tx) =>
    (tx ?? db).userAvailabilityException.delete({
      where: { id, userId },
    }),

  listEventCoachWeekly: (eventId, coachUserId, tx) =>
    (tx ?? db).eventCoachWeeklyAvailability.findMany({
      where: { eventId, coachUserId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),

  replaceEventCoachWeekly: (eventId, coachUserId, slots, tx) => {
    const client = tx ?? db;
    return runBatch(client, [
      client.eventCoachWeeklyAvailability.deleteMany({ where: { eventId, coachUserId } }),
      client.eventCoachWeeklyAvailability.createMany({
        data: slots.map((slot) => ({ ...slot, eventId, coachUserId })),
      }),
    ]);
  },
});

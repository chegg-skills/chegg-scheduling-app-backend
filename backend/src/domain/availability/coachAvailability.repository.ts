import type { UserAvailabilityException, UserWeeklyAvailability } from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { DbClient } from "../../shared/db/repository";

/**
 * The three reads behind `evaluateCoachAvailability`. `tx` matters: when the evaluation runs
 * inside a booking transaction that already holds a row lock, these reads MUST use the
 * transaction client — a read on the shared pool would need a second pool connection and can
 * deadlock the pool under load. Callers pass `tx` through; do not default it away.
 */
export interface CoachAvailabilityRepository {
  findTimezone(userId: string, tx?: DbClient): Promise<{ timezone: string } | null>;
  findWeekly(userId: string, tx?: DbClient): Promise<UserWeeklyAvailability[]>;
  findExceptionsBetween(
    userId: string,
    from: Date,
    to: Date,
    tx?: DbClient,
  ): Promise<UserAvailabilityException[]>;
}

export const createCoachAvailabilityRepo = (
  db: DbClient = prisma,
): CoachAvailabilityRepository => ({
  findTimezone: (userId, tx) =>
    (tx ?? db).user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    }),

  findWeekly: (userId, tx) => (tx ?? db).userWeeklyAvailability.findMany({ where: { userId } }),

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
});

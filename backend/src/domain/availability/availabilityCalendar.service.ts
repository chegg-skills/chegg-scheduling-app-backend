import { StatusCodes } from "http-status-codes";
import {
  EventCoachWeeklyAvailability,
  UserAvailabilityException,
  UserRole,
  UserWeeklyAvailability,
} from "@prisma/client";
import { prisma } from "../../shared/db/prisma";
import type { CallerContext } from "../../shared/utils/userUtils";
import { ErrorHandler } from "../../shared/error/errorhandler";
import {
  assertCanManageAvailability,
  parseAvailabilityExceptionDate,
  validateAvailabilityExceptionInput,
  validateWeeklySlots,
} from "./availability.shared";
import {
  queueAvailabilityExceptionNotification,
  queueAvailabilityExceptionRemovedNotification,
} from "./availability.notification";

/**
 * Service responsible for managing the raw availability data (weekly and exceptions) for users.
 * De-couples data management from the complex conflict detection logic.
 */

export const getWeeklyAvailability = async (
  userId: string,
  caller: CallerContext,
): Promise<UserWeeklyAvailability[]> => {
  await assertCanManageAvailability(userId, caller, "weekly", "read");
  return prisma.userWeeklyAvailability.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
};

export const setWeeklyAvailability = async (
  userId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  caller: CallerContext,
): Promise<UserWeeklyAvailability[]> => {
  await assertCanManageAvailability(userId, caller, "weekly", "write");
  validateWeeklySlots(slots);

  await prisma.$transaction([
    prisma.userWeeklyAvailability.deleteMany({ where: { userId } }),
    prisma.userWeeklyAvailability.createMany({
      data: slots.map((slot) => ({ ...slot, userId })),
    }),
  ]);

  return getWeeklyAvailability(userId, caller);
};

export const getAvailabilityExceptions = async (
  userId: string,
  caller: CallerContext,
): Promise<UserAvailabilityException[]> => {
  await assertCanManageAvailability(userId, caller, "exceptions", "read");
  return prisma.userAvailabilityException.findMany({
    where: { userId },
    orderBy: [{ date: "asc" }],
  });
};

export const addAvailabilityException = async (
  userId: string,
  payload: {
    date: Date | string;
    isUnavailable: boolean;
    startTime?: string | null;
    endTime?: string | null;
  },
  caller: CallerContext,
): Promise<UserAvailabilityException> => {
  await assertCanManageAvailability(userId, caller, "exceptions", "write");

  const date = parseAvailabilityExceptionDate(payload.date);
  validateAvailabilityExceptionInput({ ...payload, date: date.toISOString().split("T")[0] });

  const result = await prisma.userAvailabilityException.create({
    data: {
      userId,
      date,
      isUnavailable: payload.isUnavailable,
      startTime: payload.startTime || null,
      endTime: payload.endTime || null,
    },
  });

  void queueAvailabilityExceptionNotification({
    userId,
    date: date.toISOString().split("T")[0],
    isUnavailable: payload.isUnavailable,
    startTime: payload.startTime,
    endTime: payload.endTime,
    callerIsAdmin: caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN,
  });

  return result;
};

export const removeAvailabilityException = async (
  userId: string,
  exceptionId: string,
  caller: CallerContext,
): Promise<void> => {
  await assertCanManageAvailability(userId, caller, "exceptions", "write");

  let deleted: UserAvailabilityException;
  try {
    deleted = await prisma.userAvailabilityException.delete({
      where: { id: exceptionId, userId },
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      throw new ErrorHandler(StatusCodes.NOT_FOUND, "Availability exception not found.");
    }
    throw err;
  }

  void queueAvailabilityExceptionRemovedNotification({
    userId,
    date: deleted.date,
    isUnavailable: deleted.isUnavailable,
    startTime: deleted.startTime,
    endTime: deleted.endTime,
    callerIsAdmin: caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN,
  });
};

/**
 * Returns the event-specific weekly availability override for a coach on a given event.
 * An empty array means no override is set — the coach's global schedule applies.
 */
export const getEventCoachWeeklyAvailability = async (
  eventId: string,
  coachUserId: string,
): Promise<EventCoachWeeklyAvailability[]> => {
  return prisma.eventCoachWeeklyAvailability.findMany({
    where: { eventId, coachUserId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
};

/**
 * Atomically replaces the event-specific weekly availability override for a coach.
 * Passing an empty array clears the override and restores the global fallback.
 * Only SUPER_ADMIN and TEAM_ADMIN are permitted to call this.
 *
 * @throws {ErrorHandler} 403 — caller is not SUPER_ADMIN or TEAM_ADMIN.
 */
export const setEventCoachWeeklyAvailability = async (
  eventId: string,
  coachUserId: string,
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
  caller: CallerContext,
): Promise<EventCoachWeeklyAvailability[]> => {
  if (caller.role !== UserRole.SUPER_ADMIN && caller.role !== UserRole.TEAM_ADMIN) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "Only team administrators can manage event-specific coach schedules.",
    );
  }
  validateWeeklySlots(slots);

  await prisma.$transaction([
    prisma.eventCoachWeeklyAvailability.deleteMany({ where: { eventId, coachUserId } }),
    prisma.eventCoachWeeklyAvailability.createMany({
      data: slots.map((slot) => ({ ...slot, eventId, coachUserId })),
    }),
  ]);

  return getEventCoachWeeklyAvailability(eventId, coachUserId);
};

/**
 * Retrieves the effective availability data (weekly + relevant exceptions)
 * for a specific user and time range.
 */
export const getEffectiveAvailabilityData = async (
  userId: string,
  from: Date,
  to: Date,
  caller: CallerContext,
) => {
  await assertCanManageAvailability(userId, caller, "exceptions", "read");

  const [weekly, exceptions] = await Promise.all([
    prisma.userWeeklyAvailability.findMany({ where: { userId } }),
    prisma.userAvailabilityException.findMany({
      where: {
        userId,
        date: {
          gte: from,
          lte: to,
        },
      },
    }),
  ]);

  return { weekly, exceptions };
};

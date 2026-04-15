import {
  Prisma,
  PrismaClient,
  UserAvailabilityException,
  UserRole,
  UserWeeklyAvailability,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../../shared/error/errorhandler";
import { toDateOnlyString } from "../../shared/utils/date";
import type { CallerContext } from "../../shared/utils/userUtils";
import {
  AddAvailabilityExceptionSchema,
  AvailabilitySchemas,
  SetWeeklyAvailabilitySchema,
} from "./availability.schema";

export type AvailabilityClient = Prisma.TransactionClient | PrismaClient;

export type LocalAvailabilityInfo = {
  hhmm: string;
  dayOfWeek: number;
  dateString: string;
};

export const assertCanManageAvailability = (
  targetUserId: string,
  caller: CallerContext,
  mode: "weekly" | "exceptions",
  action: "read" | "write" = "write",
): void => {
  if (caller.role === UserRole.SUPER_ADMIN || caller.role === UserRole.TEAM_ADMIN) {
    return;
  }

  if (caller.id !== targetUserId) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "You do not have permission to manage this user's availability.",
    );
  }

  if (mode === "weekly" && action === "write" && caller.role === UserRole.COACH) {
    throw new ErrorHandler(
      StatusCodes.FORBIDDEN,
      "Coaches are not allowed to manage their own recurring weekly availability. Please contact a team administrator for schedule changes.",
    );
  }
};

export const validateWeeklySlots = (
  slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
): void => {
  SetWeeklyAvailabilitySchema.body.parse(slots);
};

export const parseAvailabilityExceptionDate = (value: Date | string): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, "Invalid date provided.");
  }
  return date;
};

export const validateAvailabilityExceptionInput = (payload: {
  isUnavailable: boolean;
  startTime?: string | null;
  endTime?: string | null;
  date?: string;
}): void => {
  // Use improved partial schema to avoid refinement issues
  AvailabilitySchemas.exception.partial.parse(payload);
};

export const buildSameSessionExclusion = (
  startTime: Date,
  endTime: Date,
  options: {
    eventId?: string;
    scheduleSlotId?: string | null;
  },
): Prisma.BookingWhereInput | undefined => {
  if (!options.eventId) {
    return undefined;
  }

  return {
    NOT: options.scheduleSlotId
      ? { scheduleSlotId: options.scheduleSlotId }
      : {
          eventId: options.eventId,
          startTime,
          endTime,
        },
  };
};

export const toLocalAvailabilityInfo = (date: Date, timeZone: string): LocalAvailabilityInfo => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value;

  const year = getPart("year")!;
  const month = getPart("month")!;
  const day = getPart("day")!;
  const hour = getPart("hour")!;
  const minute = getPart("minute")!;
  const weekdayName = getPart("weekday")!;

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    hhmm: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    dayOfWeek: weekdayMap[weekdayName],
    dateString: `${year}-${month}-${day}`,
  };
};

export const findAvailabilityException = (
  exceptions: UserAvailabilityException[],
  dateString: string,
): UserAvailabilityException | undefined => {
  return exceptions.find((exception) => {
    return toDateOnlyString(exception.date) === dateString;
  });
};

export const resolveAvailabilityFromException = (
  dayException: UserAvailabilityException | undefined,
  startLocal: LocalAvailabilityInfo,
  endLocal: LocalAvailabilityInfo,
): boolean | null => {
  if (!dayException) {
    return null;
  }

  if (dayException.isUnavailable && !dayException.startTime) {
    return false;
  }

  if (dayException.isUnavailable && dayException.startTime && dayException.endTime) {
    const overlapsException =
      startLocal.hhmm < dayException.endTime && endLocal.hhmm > dayException.startTime;

    return overlapsException ? false : null;
  }

  if (!dayException.isUnavailable && dayException.startTime && dayException.endTime) {
    return startLocal.hhmm >= dayException.startTime && endLocal.hhmm <= dayException.endTime;
  }

  return null;
};

export const isWithinWeeklyAvailability = (
  weekly: UserWeeklyAvailability[],
  startLocal: LocalAvailabilityInfo,
  endLocal: LocalAvailabilityInfo,
): boolean => {
  const daySlots = weekly.filter((slot) => slot.dayOfWeek === startLocal.dayOfWeek);

  return daySlots.some(
    (slot) => startLocal.hhmm >= slot.startTime && endLocal.hhmm <= slot.endTime,
  );
};

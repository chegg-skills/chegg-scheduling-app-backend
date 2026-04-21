import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const getStartOfDate = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

export const getEndOfDate = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

export const formatDateRangeLabel = (start: Date | null, end: Date | null): string => {
  if (!start || !end) {
    return "All time";
  }

  return `${DATE_FORMATTER.format(start)} – ${DATE_FORMATTER.format(end)}`;
};

export const toDateOnlyString = (date: Date): string => date.toISOString().split("T")[0];

export const parseDateInput = (value: Date | string, fieldName = "date"): Date => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ErrorHandler(StatusCodes.BAD_REQUEST, `Invalid ${fieldName} provided.`);
  }

  return date;
};

/**
 * Returns true if the value is a date-only string (e.g. "2026-12-07").
 * These are treated as end-of-day for the `endDate` parameter so that a
 * same-day query like ?startDate=2026-12-07&endDate=2026-12-07 covers the
 * full 24-hour window rather than the zero-length interval [midnight, midnight].
 */
const isDateOnlyString = (value: string | Date): boolean =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const parseBoundedDateRange = ({
  startDate,
  endDate,
  maxRangeDays,
}: {
  startDate: string | Date;
  endDate: string | Date;
  maxRangeDays?: number;
}): { start: Date; end: Date } => {
  const start = parseDateInput(startDate, "startDate");
  const end = parseDateInput(endDate, "endDate");

  // When endDate is a date-only string (no time component), extend to UTC
  // end-of-day so the range is inclusive of the entire requested day.
  if (isDateOnlyString(endDate)) {
    end.setUTCHours(23, 59, 59, 999);
  }

  if (start.getTime() > end.getTime()) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      "startDate must be before or equal to endDate.",
    );
  }

  if (
    maxRangeDays !== undefined &&
    end.getTime() - start.getTime() > maxRangeDays * 24 * 60 * 60 * 1000
  ) {
    throw new ErrorHandler(
      StatusCodes.BAD_REQUEST,
      `Date range cannot exceed ${maxRangeDays} days.`,
    );
  }

  return { start, end };
};

export const formatNotificationDate = (date: Date, timezone?: string | null): string => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: timezone || "UTC",
    }).format(date);
  } catch (error) {
    // Fallback if timezone is invalid
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: "UTC",
    }).format(date);
  }
};

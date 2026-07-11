import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import { logger } from "../logging/logger";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Returns a new Date set to midnight in the **server's local timezone**.
 * Used for reporting/display comparisons — not for slot generation, which
 * uses UTC or `startOfDayInTimezone` from the frontend utility.
 */
export const getStartOfDate = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Returns a new Date set to 23:59:59.999 in the **server's local timezone**.
 * Pair with `getStartOfDate` for inclusive same-day range queries in reporting.
 */
export const getEndOfDate = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Formats a date range as "Mon D, YYYY – Mon D, YYYY" for display.
 * Returns "All time" when either bound is null (unbounded range).
 */
export const formatDateRangeLabel = (start: Date | null, end: Date | null): string => {
  if (!start || !end) {
    return "All time";
  }

  return `${DATE_FORMATTER.format(start)} – ${DATE_FORMATTER.format(end)}`;
};

/** Extracts the `YYYY-MM-DD` portion of an ISO 8601 UTC timestamp. */
export const toDateOnlyString = (date: Date): string => date.toISOString().split("T")[0];

/**
 * Parses a date string or Date object, throwing a 400 if the value is invalid.
 *
 * @param value - ISO string or existing Date object to parse.
 * @param fieldName - Field label used in the error message (default `"date"`).
 * @throws {ErrorHandler} 400 — value does not parse to a valid date.
 */
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

/**
 * Parses and validates a date range from query parameters, returning UTC Date
 * objects ready for Prisma comparisons.
 *
 * Date-only `endDate` strings (e.g. `"2026-12-07"`) are extended to
 * `23:59:59.999 UTC` so that a same-day query covers the full 24-hour window
 * rather than the zero-length interval `[midnight, midnight)`.
 *
 * @param startDate - Inclusive range start (ISO string or Date).
 * @param endDate   - Inclusive range end (ISO string or Date).
 * @param maxRangeDays - Optional cap on the allowed range width.
 * @throws {ErrorHandler} 400 — invalid date, start after end, or range exceeds cap.
 */
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

/**
 * Formats a UTC Date into a human-readable string for notification emails,
 * localised to the **recipient's** IANA timezone.
 *
 * Always pass a per-recipient timezone — never a single `booking.timezone`
 * for all recipients. Student, coach, and admin emails each use different
 * timezones (see `getBookingNotificationVariables` in `booking.notification.ts`).
 *
 * Falls back to UTC with a `console.warn` when `timezone` is absent or invalid
 * so that misconfigured notifications degrade gracefully instead of crashing.
 *
 * @param date     - The UTC Date to format.
 * @param timezone - IANA timezone string for the intended recipient.
 * @returns Formatted string such as "Monday, June 1, 2026 at 2:30 PM".
 */
export const formatNotificationDate = (date: Date, timezone?: string | null): string => {
  if (!timezone) {
    logger.warn("formatNotificationDate called without timezone — falling back to UTC.");
  }
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
  } catch {
    logger.warn({ timezone }, "formatNotificationDate received invalid timezone — falling back to UTC.");
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

/**
 * Formats a date-only "expires on" string (no weekday, no time-of-day) for expiry
 * reminder emails — deliberately not formatNotificationDate, which always includes
 * a weekday and time and would misleadingly imply an exact expiry time that
 * doesn't exist. Single source for what was previously two identical
 * `toLocaleDateString` copies (event link expiry, Zoom ISV link expiry).
 *
 * @param date     - The UTC Date to format.
 * @param timezone - IANA timezone string; defaults to UTC when absent.
 * @returns Formatted string such as "August 1, 2026".
 */
export const formatExpiryDate = (date: Date, timezone?: string | null): string =>
  date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: timezone || "UTC",
  });

/**
 * Maps an IANA timezone string to a user-friendly display name for email
 * footers (e.g. `"Asia/Kolkata"` → `"India Standard Time"`).
 *
 * For unmapped zones, falls back to the city portion of the IANA key with
 * underscores replaced by spaces (e.g. `"America/Buenos_Aires"` → `"Buenos Aires"`).
 * Returns `"UTC Time"` when the input is null or undefined.
 *
 * @param ianaZone - IANA timezone identifier from `Booking.timezone` or `User.timezone`.
 */
export const getFriendlyTimezoneLabel = (ianaZone: string | null | undefined): string => {
  if (!ianaZone) return "UTC Time";
  const mapping: Record<string, string> = {
    // US/Canada
    "America/Los_Angeles": "Pacific Time - US & Canada",
    "America/Denver": "Mountain Time - US & Canada",
    "America/Chicago": "Central Time - US & Canada",
    "America/New_York": "Eastern Time - US & Canada",
    "America/Anchorage": "Alaska Time",
    "America/Phoenix": "Arizona, Yukon Time",
    "America/St_Johns": "Newfoundland Time",
    "Pacific/Honolulu": "Hawaii Time",
    // America
    "America/Adak": "America/Adak",
    "America/Argentina/Buenos_Aires": "Buenos Aires Time",
    "America/Asuncion": "Asuncion Time",
    "America/Bogota": "Bogota, Jamaica, Lima Time",
    "America/Campo_Grande": "America/Campo Grande",
    "America/Caracas": "Caracas Time",
    "America/Godthab": "America/Godthab",
    "America/Halifax": "Atlantic Time",
    "America/Regina": "Saskatchewan, Guatemala, Costa Rica Time",
    "America/Havana": "America/Havana",
    "America/Mazatlan": "America/Mazatlan",
    "America/Mexico_City": "Mexico City Time",
    "America/Montevideo": "Montevideo Time",
    "America/Miquelon": "America/Miquelon",
    "America/Noronha": "America/Noronha",
    "America/Santiago": "Santiago Time",
    "America/Santa_Isabel": "America/Santa Isabel",
    "America/Puerto_Rico": "Atlantic Standard Time",
    "America/Sao_Paulo": "Brasilia Time",
    // Africa
    "Africa/Cairo": "Africa/Cairo",
    "Africa/Maputo": "Central Africa Time",
    "Africa/Lagos": "West Africa Time",
    "Africa/Windhoek": "Africa/Windhoek",
    // Asia
    "Asia/Amman": "Jordan Time",
    "Asia/Baghdad": "Baghdad, East Africa Time",
    "Asia/Baku": "Asia/Baku",
    "Asia/Beirut": "Lebanon Time",
    "Asia/Damascus": "Syria Time",
    "Asia/Dhaka": "Asia/Dhaka",
    "Asia/Dubai": "Dubai Time",
    "Asia/Gaza": "Asia/Gaza",
    "Asia/Irkutsk": "Asia/Irkutsk",
    "Asia/Bangkok": "Indochina Time",
    "Asia/Jerusalem": "Israel Time",
    "Asia/Kabul": "Kabul Time",
    "Pacific/Majuro": "Pacific/Majuro",
    "Asia/Karachi": "Pakistan, Maldives Time",
    "Asia/Kathmandu": "Kathmandu Time",
    "Asia/Colombo": "India, Sri Lanka Time",
    "Asia/Krasnoyarsk": "Krasnoyarsk Time",
    "Asia/Omsk": "Asia/Omsk",
    "Asia/Yangon": "Asia/Rangoon",
    "Asia/Singapore": "China, Singapore, Perth",
    "Asia/Tehran": "Tehran Time",
    "Asia/Tokyo": "Japan, Korea Time",
    "Asia/Vladivostok": "Asia/Vladivostok",
    "Asia/Yakutsk": "Asia/Yakutsk",
    "Asia/Yekaterinburg": "Yekaterinburg Time",
    "Asia/Yerevan": "Asia/Yerevan",
    "Asia/Kolkata": "India Standard Time",
    "Asia/Calcutta": "India Standard Time", // Alias support
    // Atlantic
    "Atlantic/Azores": "Azores Time",
    "Atlantic/Cape_Verde": "Cape Verde Time",
    // Australia
    "Australia/Adelaide": "Adelaide Time",
    "Australia/Brisbane": "Brisbane Time",
    "Australia/Darwin": "Australia/Darwin",
    "Australia/Eucla": "Australia/Eucla",
    "Australia/Lord_Howe": "Australia/Lord Howe",
    "Australia/Perth": "Australia/Perth",
    "Australia/Sydney": "Sydney, Melbourne Time",
    // UTC
    UTC: "UTC Time",
    // Europe
    "Europe/Paris": "Central European Time",
    "Europe/Athens": "Eastern European Time",
    "Europe/London": "UK, Ireland, Lisbon Time",
    "Europe/Minsk": "Minsk Time",
    "Europe/Moscow": "Moscow Time",
    "Europe/Istanbul": "Turkey Time",
    // Pacific
    "Pacific/Apia": "Pacific/Apia",
    "Pacific/Auckland": "Auckland Time",
    "Pacific/Chatham": "Pacific/Chatham",
    "Pacific/Easter": "Pacific/Easter",
    "Pacific/Fiji": "Pacific/Fiji",
    "Pacific/Gambier": "Pacific/Gambier",
    "Pacific/Kiritimati": "Pacific/Kiritimati",
    "Pacific/Marquesas": "Pacific/Marquesas",
    "Pacific/Norfolk": "Pacific/Norfolk",
    "Pacific/Noumea": "Pacific/Noumea",
    "Pacific/Pago_Pago": "Pacific/Pago Pago",
    "Pacific/Pitcairn": "Pacific/Pitcairn",
    "Pacific/Tarawa": "Pacific/Tarawa",
    "Pacific/Tongatapu": "Pacific/Tongatapu",
  };
  return mapping[ianaZone] || ianaZone.split("/").pop()?.replace(/_/g, " ") || ianaZone;
};

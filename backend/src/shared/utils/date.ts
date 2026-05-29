import { StatusCodes } from "http-status-codes";
import { ErrorHandler } from "../error/errorhandler";
import { logger } from "../logging/logger";

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
    logger.warn("formatNotificationDate received invalid timezone — falling back to UTC.", { timezone });
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

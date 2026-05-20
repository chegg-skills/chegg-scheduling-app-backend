import type { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendSuccessResponse } from "../../shared/utils/helper/responseHelper";
import { ConfigService } from "./config.service";
import { getFriendlyTimezoneLabel } from "../../shared/utils/date";

const US_CANADA_ZONES = new Set([
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "America/Phoenix",
  "America/St_Johns",
  "Pacific/Honolulu",
]);

const getTimezoneGroup = (iana: string): string => {
  if (US_CANADA_ZONES.has(iana)) return "US/Canada";
  if (iana === "UTC") return "UTC";
  if (iana === "Pacific/Majuro") return "Asia";
  const prefix = iana.split("/")[0];
  const prefixMap: Record<string, string> = {
    America: "America",
    Africa: "Africa",
    Asia: "Asia",
    Atlantic: "Atlantic",
    Australia: "Australia",
    Europe: "Europe",
    Pacific: "Pacific",
  };
  return prefixMap[prefix] ?? "Universal";
};

const CURATED_IANA_TIMEZONES = [
  // US/Canada
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
  "America/Phoenix",
  "America/St_Johns",
  "Pacific/Honolulu",
  // America
  "America/Adak",
  "America/Argentina/Buenos_Aires",
  "America/Asuncion",
  "America/Bogota",
  "America/Campo_Grande",
  "America/Caracas",
  "America/Godthab",
  "America/Halifax",
  "America/Regina",
  "America/Havana",
  "America/Mazatlan",
  "America/Mexico_City",
  "America/Montevideo",
  "America/Miquelon",
  "America/Noronha",
  "America/Santiago",
  "America/Santa_Isabel",
  "America/Puerto_Rico",
  "America/Sao_Paulo",
  // Africa
  "Africa/Cairo",
  "Africa/Maputo",
  "Africa/Lagos",
  "Africa/Windhoek",
  // Asia
  "Asia/Amman",
  "Asia/Baghdad",
  "Asia/Baku",
  "Asia/Beirut",
  "Asia/Damascus",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Gaza",
  "Asia/Irkutsk",
  "Asia/Bangkok",
  "Asia/Jerusalem",
  "Asia/Kabul",
  "Pacific/Majuro",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Colombo",
  "Asia/Krasnoyarsk",
  "Asia/Omsk",
  "Asia/Yangon",
  "Asia/Singapore",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Asia/Vladivostok",
  "Asia/Yakutsk",
  "Asia/Yekaterinburg",
  "Asia/Yerevan",
  "Asia/Kolkata",
  // Atlantic
  "Atlantic/Azores",
  "Atlantic/Cape_Verde",
  // Australia
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Darwin",
  "Australia/Eucla",
  "Australia/Lord_Howe",
  "Australia/Perth",
  "Australia/Sydney",
  // UTC
  "UTC",
  // Europe
  "Europe/Paris",
  "Europe/Athens",
  "Europe/London",
  "Europe/Minsk",
  "Europe/Moscow",
  "Europe/Istanbul",
  // Pacific
  "Pacific/Apia",
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Pacific/Easter",
  "Pacific/Fiji",
  "Pacific/Gambier",
  "Pacific/Kiritimati",
  "Pacific/Marquesas",
  "Pacific/Norfolk",
  "Pacific/Noumea",
  "Pacific/Pago_Pago",
  "Pacific/Pitcairn",
  "Pacific/Tarawa",
  "Pacific/Tongatapu",
];

/**
 * Get all supported IANA timezones
 */
export const getTimezones = (_req: Request, res: Response) => {
  const timezones = CURATED_IANA_TIMEZONES.map((iana) => ({
    iana,
    label: getFriendlyTimezoneLabel(iana),
    group: getTimezoneGroup(iana),
  }));
  return sendSuccessResponse(res, StatusCodes.OK, { timezones }, "Timezones fetched successfully.");
};

/**
 * Get all countries
 */
export const getCountries = (_req: Request, res: Response) => {
  const countries = ConfigService.getCountries();

  return sendSuccessResponse(res, StatusCodes.OK, { countries }, "Countries fetched successfully.");
};

/**
 * Get all languages
 */
export const getLanguages = (_req: Request, res: Response) => {
  const languages = ConfigService.getLanguages();

  return sendSuccessResponse(res, StatusCodes.OK, { languages }, "Languages fetched successfully.");
};

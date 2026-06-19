import { z } from "zod";

// Cap the queryable span so the slots/session-dates endpoints never scan an
// unbounded window. The Tracker UI keeps selections within 365 days, so this
// 366-day cap only ever rejects out-of-band direct API calls.
const MAX_RANGE_DAYS = 366;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const isWithinRangeCap = (startDate?: string, endDate?: string): boolean => {
  if (!startDate || !endDate) return true;
  const spanDays = (new Date(`${endDate}T00:00:00.000`).getTime() -
    new Date(`${startDate}T00:00:00.000`).getTime()) / MS_PER_DAY;
  return spanDays >= 0 && spanDays <= MAX_RANGE_DAYS;
};

const rangeCapError = {
  message: `Date range must be in order and span at most ${MAX_RANGE_DAYS} days.`,
  path: ["endDate"],
};

export const TrackerSlotsQuerySchema = {
  query: z
    .looseObject({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
        .optional(),
      startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format")
        .optional(),
      endDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format")
        .optional(),
      teamId: z.uuid().optional(),
      eventId: z.uuid().optional(),
    })
    .refine((q) => isWithinRangeCap(q.startDate, q.endDate), rangeCapError),
};

export const TrackerSessionDatesQuerySchema = {
  query: z
    .looseObject({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be in YYYY-MM-DD format"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "endDate must be in YYYY-MM-DD format"),
      teamId: z.uuid().optional(),
      eventId: z.uuid().optional(),
    })
    .refine((q) => isWithinRangeCap(q.startDate, q.endDate), rangeCapError),
};

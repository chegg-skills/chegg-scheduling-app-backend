import { z } from "zod";

export const TrackerSlotsQuerySchema = {
  query: z.looseObject({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
      .optional(),
    teamId: z.uuid().optional(),
    eventId: z.uuid().optional(),
  }),
};

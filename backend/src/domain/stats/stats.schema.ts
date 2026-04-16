import { z } from "zod";

export const StatsQuerySchema = {
  query: z.looseObject({
    timeframe: z.string().optional().default("thisMonth"),
    teamId: z.string().uuid().optional(),
  }),
};

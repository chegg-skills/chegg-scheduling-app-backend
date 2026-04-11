import { z } from "zod";

export const StatsQuerySchema = {
    query: z.object({
        timeframe: z.enum(["day", "week", "month", "year"]).optional().default("month"),
        teamId: z.string().uuid().optional(),
    }).passthrough(),
};

import { z } from "zod";

export const UpdateSystemSettingsSchema = {
  body: z.object({
    feedbackFormLink: z
      .string()
      .trim()
      .url("Invalid feedback form link URL")
      .or(z.literal(""))
      .optional()
      .default(""),
  }),
};

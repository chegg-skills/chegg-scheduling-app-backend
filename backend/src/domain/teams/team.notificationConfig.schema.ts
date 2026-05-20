import { z } from "zod";

export const GetNotificationConfigSchema = {
  params: z.object({
    teamId: z.uuid(),
  }),
};

export const UpsertNotificationConfigSchema = {
  params: z.object({
    teamId: z.uuid(),
  }),
  body: z.object({
    reminderOffsets: z
      .array(z.number().int().nonnegative().max(10080))
      .refine((arr) => new Set(arr).size === arr.length, "Duplicate offsets not allowed"),
    adminNotifyOnBooking: z.boolean(),
    adminNotifyOnCancellation: z.boolean(),
    adminNotifyOnNoShow: z.boolean(),
    coachNotifyOnBooking: z.boolean(),
    coachNotifyOnCancellation: z.boolean(),
    coachNotifyOnNoShow: z.boolean(),
    notifyLeadOnAvailability: z.boolean(),
  }),
};

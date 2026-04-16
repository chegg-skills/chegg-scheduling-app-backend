import { z } from "zod";

const timeStringSchema = z
  .string()
  .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)");

const userIdSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

const exceptionIdSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  exceptionId: z.string().uuid("Invalid exception ID"),
});

const WeeklyAvailabilityBase = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeStringSchema,
  endTime: timeStringSchema,
});

const AvailabilityExceptionBase = z.object({
  date: z.preprocess(
    (val) => {
      if (val instanceof Date) {
        return val.toISOString().split("T")[0];
      }
      return val;
    },
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  ),
  isUnavailable: z.boolean(),
  startTime: timeStringSchema.optional().nullable(),
  endTime: timeStringSchema.optional().nullable(),
});

const validateTimeRange = (data: { startTime?: string | null; endTime?: string | null }) => {
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime;
  }
  return true;
};

export const SetWeeklyAvailabilitySchema = {
  params: userIdSchema,
  body: z
    .array(
      WeeklyAvailabilityBase.refine(validateTimeRange, {
        message: "startTime must be before endTime",
        path: ["endTime"],
      }),
    )
    .min(0),
};

export const AddAvailabilityExceptionSchema = {
  params: userIdSchema,
  body: AvailabilityExceptionBase.refine(
    (data) => {
      if (!data.isUnavailable) {
        return !!data.startTime && !!data.endTime;
      }
      return true;
    },
    {
      message: "Availability exceptions require startTime and endTime if not unavailable",
      path: ["startTime"],
    },
  )
    .refine(validateTimeRange, {
      message: "startTime must be before endTime",
      path: ["endTime"],
    })
    .passthrough(),
};

export const GetEffectiveAvailabilitySchema = {
  params: userIdSchema,
  query: z
    .object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    })
    .passthrough(),
};

export const UserIdParamSchema = {
  params: userIdSchema,
};

export const ExceptionIdParamSchema = {
  params: exceptionIdSchema,
};

export const AvailabilitySchemas = {
  exception: {
    base: AvailabilityExceptionBase,
    // For partials, we separate the object from the refinement to avoid Zod restriction
    partial: AvailabilityExceptionBase.partial()
      .passthrough()
      .refine(validateTimeRange, {
        message: "startTime must be before endTime",
        path: ["endTime"],
      }),
  },
  weekly: {
    base: WeeklyAvailabilityBase,
    partial: WeeklyAvailabilityBase.partial()
      .passthrough()
      .refine(validateTimeRange, {
        message: "startTime must be before endTime",
        path: ["endTime"],
      }),
  },
};

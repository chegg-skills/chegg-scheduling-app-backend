import { z } from "zod";

export const ListStudentsSchema = {
  query: z.looseObject({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().default(50),
    search: z.string().optional(),
  }),
};

export const StudentIdParamSchema = {
  params: z.object({
    studentId: z.uuid("Invalid student ID"),
  }),
};

export const SendEmailSchema = {
  params: z.object({
    studentId: z.uuid("Invalid student ID"),
  }),
  body: z.object({
    subject: z
      .string()
      .trim()
      .min(1, "Subject is required")
      .max(200, "Subject cannot exceed 200 characters"),
    body: z
      .string()
      .min(1, "Body is required")
      .max(50000, "Email body cannot exceed 50,000 characters"),
  }),
};

export const RetryEmailParamsSchema = {
  params: z.object({
    logId: z.uuid("Invalid log ID"),
  }),
};

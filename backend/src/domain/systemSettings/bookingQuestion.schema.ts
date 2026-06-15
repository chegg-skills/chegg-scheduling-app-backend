import { z } from "zod";

export const CreateBookingQuestionSchema = {
  body: z.object({
    text: z.string().trim().min(1, "Question text cannot be empty.").max(255, "Question must be 255 characters or less."),
  }),
};

export const UpdateBookingQuestionSchema = {
  body: z.object({
    text: z.string().trim().min(1, "Question text cannot be empty.").max(255, "Question must be 255 characters or less.").optional(),
    order: z.number().int().min(0).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
};

import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { stripHtml } from "../../shared/utils/htmlSanitizer";

export const CreateBookingSchema = {
  body: z
    .object({
      studentName: z.string().trim().min(1, "Student name is required"),
      studentEmail: z.email("Invalid email address").trim(),
      teamId: z.uuid("Invalid team ID"),
      eventId: z.uuid("Invalid event ID"),
      startTime: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
      }, z.date()),
      timezone: z.string().trim().optional(),
      notes: z.string().trim().max(500, "Notes must be 500 characters or less").transform(stripHtml).optional(),
      specificQuestion: z.string().trim().max(500, "Specific question must be 500 characters or less").transform(stripHtml).optional(),
      triedSolutions: z.string().trim().max(500, "Tried solutions must be 500 characters or less").transform(stripHtml).optional(),
      usedResources: z.string().trim().max(500, "Used resources must be 500 characters or less").transform(stripHtml).optional(),
      sessionObjectives: z.string().trim().max(500, "Session objectives must be 500 characters or less").transform(stripHtml).optional(),
      preferredCoachId: z.uuid().optional(),
    })
    .strip(),
};

export const RescheduleBookingSchema = {
  params: z
    .object({
      bookingId: z.uuid("Invalid booking ID"),
    })
    .strip(),
  body: z
    .object({
      startTime: z.string().datetime().or(z.date()),
      timezone: z.string().trim().optional(),
      token: z.string().trim().optional(),
    })
    .strip(),
};

export const ListBookingsSchema = {
  query: z
    .object({
      teamId: z.uuid("Invalid team ID").optional(),
      eventId: z.uuid("Invalid event ID").optional(),
      coachUserId: z.uuid("Invalid host ID").optional(),
      status: z.enum(BookingStatus).optional(),
      search: z.string().trim().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
    })
    .strip(),
};

export const UpdateBookingStatusSchema = {
  params: z
    .object({
      bookingId: z.uuid("Invalid booking ID"),
    })
    .strip(),
  body: z
    .object({
      status: z.enum(BookingStatus),
      cancellationReason: z
        .string()
        .trim()
        .max(500)
        .regex(/^[^<>]*$/, "Cancellation reason must not contain HTML characters")
        .optional(),
    })
    .strip(),
};

export const CancelBookingSchema = {
  params: z
    .object({
      bookingId: z.uuid("Invalid booking ID"),
    })
    .strip(),
  body: z
    .object({
      token: z.string().trim().optional(),
      cancellationReason: z
        .string()
        .trim()
        .max(500)
        .regex(/^[^<>]*$/, "Cancellation reason must not contain HTML characters")
        .optional(),
    })
    .strip(),
};

export const BookingIdParamSchema = {
  params: z
    .object({
      bookingId: z.uuid("Invalid booking ID"),
    })
    .strip(),
};

export const UpsertBookingSessionLogSchema = {
  params: z
    .object({
      bookingId: z.uuid("Invalid booking ID"),
    })
    .strip(),
  body: z
    .object({
      topicsDiscussed: z.string().trim().nullable().optional(),
      summary: z.string().trim().nullable().optional(),
      coachNotes: z.string().trim().nullable().optional(),
      attended: z.boolean().optional(),
    })
    .strip(),
};

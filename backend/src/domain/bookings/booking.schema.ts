import { z } from "zod";
import { BookingStatus } from "@prisma/client";

export const CreateBookingSchema = {
  body: z
    .object({
      studentName: z.string().trim().min(1, "Student name is required"),
      studentEmail: z.string().trim().email("Invalid email address"),
      teamId: z.string().uuid("Invalid team ID"),
      eventId: z.string().uuid("Invalid event ID"),
      startTime: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
        return arg;
      }, z.date()),
      timezone: z.string().trim().optional(),
      notes: z.string().trim().optional(),
      specificQuestion: z.string().trim().optional(),
      triedSolutions: z.string().trim().optional(),
      usedResources: z.string().trim().optional(),
      sessionObjectives: z.string().trim().optional(),
      preferredCoachId: z.string().uuid().optional(),
    })
    .strip(),
};

export const RescheduleBookingSchema = {
  params: z
    .object({
      bookingId: z.string().uuid("Invalid booking ID"),
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
      teamId: z.string().uuid("Invalid team ID").optional(),
      eventId: z.string().uuid("Invalid event ID").optional(),
      coachUserId: z.string().uuid("Invalid host ID").optional(),
      status: z.nativeEnum(BookingStatus).optional(),
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
      bookingId: z.string().uuid("Invalid booking ID"),
    })
    .strip(),
  body: z
    .object({
      status: z.nativeEnum(BookingStatus),
    })
    .strip(),
};

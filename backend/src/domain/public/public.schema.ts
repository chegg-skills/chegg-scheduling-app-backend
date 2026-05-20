import { z } from "zod";

const slugSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
});

export const PublicSlugSchema = {
  params: slugSchema,
};

export const ListTeamEventsSchema = {
  params: z.object({
    teamId: z.uuid("Invalid team ID"),
  }),
};

export const GetAvailableSlotsSchema = {
  params: z.object({
    eventId: z.uuid("Invalid event ID"),
  }),
  query: z.looseObject({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
};

export const GetPublicBookingSchema = {
  params: z.object({
    id: z.uuid("Invalid booking ID"),
  }),
};

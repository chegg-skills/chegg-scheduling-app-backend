import { z } from "zod";

const slugSchema = z.object({
    slug: z.string().min(1, "Slug is required"),
});

export const PublicSlugSchema = {
    params: slugSchema,
};

export const ListTeamEventsSchema = {
    params: z.object({
        teamId: z.string().uuid("Invalid team ID"),
    }),
};

export const GetAvailableSlotsSchema = {
    params: z.object({
        eventId: z.string().uuid("Invalid event ID"),
    }),
    query: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
    }).passthrough(),
};

export const GetPublicBookingSchema = {
    params: z.object({
        id: z.string().uuid("Invalid booking ID"),
    }),
};

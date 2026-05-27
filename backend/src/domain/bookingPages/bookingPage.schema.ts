import { z } from "zod";
import { slugField } from "../../shared/utils/slugSchema";

export const CreateBookingPageSchema = {
  body: z.object({
    slug: slugField,
    name: z.string().trim().min(1, "Name is required.").max(100),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const UpdateBookingPageSchema = {
  params: z.object({ pageId: z.uuid("Invalid booking page ID.") }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const BookingPageParamsSchema = {
  params: z.object({ pageId: z.uuid("Invalid booking page ID.") }),
};

export const AddSectionSchema = {
  params: z.object({ pageId: z.uuid("Invalid booking page ID.") }),
  body: z.object({
    sessionTypeId: z.uuid("Invalid session type ID."),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const SectionParamsSchema = {
  params: z.object({
    pageId: z.uuid("Invalid booking page ID."),
    sectionId: z.uuid("Invalid section ID."),
  }),
};

export const AddTeamToSectionSchema = {
  params: z.object({
    pageId: z.uuid("Invalid booking page ID."),
    sectionId: z.uuid("Invalid section ID."),
  }),
  body: z.object({
    teamId: z.uuid("Invalid team ID."),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const TeamInSectionParamsSchema = {
  params: z.object({
    pageId: z.uuid("Invalid booking page ID."),
    sectionId: z.uuid("Invalid section ID."),
    teamId: z.uuid("Invalid team ID."),
  }),
};

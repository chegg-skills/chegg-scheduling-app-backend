import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CreateBookingPageSchema = {
  body: z.looseObject({
    slug: z
      .string()
      .trim()
      .min(1, "Slug is required.")
      .max(100)
      .regex(SLUG_PATTERN, "Slug must be lowercase letters, numbers, and hyphens only."),
    name: z.string().trim().min(1, "Name is required.").max(100),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const UpdateBookingPageSchema = {
  params: z.object({ pageId: z.uuid("Invalid booking page ID.") }),
  body: z.looseObject({
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
  body: z.looseObject({
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
  body: z.looseObject({
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

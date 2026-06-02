import z from "zod";
import { slugField } from "../../shared/utils/slugSchema";

export const CreateBookingDirectorySchema = {
  body: z.object({
    slug: slugField,
    name: z.string().trim().min(1, "Name is required.").max(100),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const UpdateBookingDirectorySchema = {
  params: z.object({ directoryId: z.string().uuid("Invalid booking directory ID.") }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const BookingDirectoryParamsSchema = {
  params: z.object({ directoryId: z.string().uuid("Invalid booking directory ID.") }),
};

export const AddSectionSchema = {
  params: z.object({ directoryId: z.string().uuid("Invalid booking directory ID.") }),
  body: z.object({
    sessionTypeId: z.string().uuid("Invalid session type ID."),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const SectionParamsSchema = {
  params: z.object({
    directoryId: z.string().uuid("Invalid booking directory ID."),
    sectionId: z.string().uuid("Invalid section ID."),
  }),
};

export const AddTeamToSectionSchema = {
  params: z.object({
    directoryId: z.string().uuid("Invalid booking directory ID."),
    sectionId: z.string().uuid("Invalid section ID."),
  }),
  body: z.object({
    teamId: z.string().uuid("Invalid team ID."),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const TeamInSectionParamsSchema = {
  params: z.object({
    directoryId: z.string().uuid("Invalid booking directory ID."),
    sectionId: z.string().uuid("Invalid section ID."),
    teamId: z.string().uuid("Invalid team ID."),
  }),
};

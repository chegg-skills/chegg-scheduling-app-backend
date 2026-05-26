import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugField = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(100)
  .regex(SLUG_PATTERN, "Slug must be lowercase letters, numbers, and hyphens only.");

const nameField = z.string().trim().min(1, "Name is required.").max(100);
const descriptionField = z.string().trim().max(500).nullable().optional();

export const CreateSessionTypeSchema = {
  body: z.looseObject({
    slug: slugField,
    name: nameField,
    description: descriptionField,
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const UpdateSessionTypeSchema = {
  params: z.object({ sessionTypeId: z.uuid("Invalid session type ID.") }),
  body: z.looseObject({
    name: nameField.optional(),
    description: descriptionField,
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const SessionTypeParamsSchema = {
  params: z.object({ sessionTypeId: z.uuid("Invalid session type ID.") }),
};

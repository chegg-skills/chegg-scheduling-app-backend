import { z } from "zod";
import { slugField } from "../../shared/utils/slugSchema";

const nameField = z.string().trim().min(1, "Name is required.").max(100);
const descriptionField = z.string().trim().max(500).nullable().optional();

export const CreateSessionTypeSchema = {
  body: z.object({
    slug: slugField,
    name: nameField,
    description: descriptionField,
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const UpdateSessionTypeSchema = {
  params: z.object({ sessionTypeId: z.uuid("Invalid session type ID.") }),
  body: z.object({
    name: nameField.optional(),
    description: descriptionField,
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }),
};

export const SessionTypeParamsSchema = {
  params: z.object({ sessionTypeId: z.uuid("Invalid session type ID.") }),
};

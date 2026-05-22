import { z } from "zod";

const NAME_MAX = 80;
const DESCRIPTION_MAX = 500;
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const nameField = z.string().trim().min(1, "Group name is required.").max(NAME_MAX);
const descriptionField = z.string().trim().max(DESCRIPTION_MAX).nullable().optional();
const colorField = z
  .string()
  .trim()
  .regex(HEX_COLOR, "Color must be a hex value like #3b82f6.")
  .nullable()
  .optional();

export const CreateEventGroupSchema = {
  params: z.object({
    teamId: z.uuid("Invalid team ID."),
  }),
  body: z.looseObject({
    name: nameField,
    description: descriptionField,
    color: colorField,
  }),
};

export const UpdateEventGroupSchema = {
  params: z.object({
    groupId: z.uuid("Invalid group ID."),
  }),
  body: z.looseObject({
    name: nameField.optional(),
    description: descriptionField,
    color: colorField,
  }),
};

export const ListEventGroupsSchema = {
  params: z.object({
    teamId: z.uuid("Invalid team ID."),
  }),
};

export const EventGroupParamsSchema = {
  params: z.object({
    groupId: z.uuid("Invalid group ID."),
  }),
};

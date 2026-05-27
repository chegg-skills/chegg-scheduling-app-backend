import { z } from "zod";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugField = z
  .string()
  .trim()
  .min(1, "Slug is required.")
  .max(100)
  .regex(SLUG_PATTERN, "Slug must be lowercase letters, numbers, and hyphens only.");

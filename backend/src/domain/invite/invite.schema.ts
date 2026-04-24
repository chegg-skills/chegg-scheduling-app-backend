import { z } from "zod";
import { UserRole } from "@prisma/client";

export const CreateInviteSchema = {
  body: z
    .object({
      email: z.string().email("Invalid email address"),
      role: z.nativeEnum(UserRole).default(UserRole.COACH),
      teamId: z.string().uuid().optional().nullable(),
      requiresSso: z.boolean().optional().default(false),
    })
    .passthrough(),
};

export const AcceptInviteSchema = {
  body: z
    .object({
      token: z.string().min(1, "Token is required"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      timezone: z.string().optional(),
    })
    .passthrough(),
};

export const ValidateInviteSchema = {
  query: z.object({
    token: z.string().min(1, "Token is required"),
  }),
};

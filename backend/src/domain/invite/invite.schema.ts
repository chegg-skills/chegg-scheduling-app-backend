import { z } from "zod";
import { UserRole } from "@prisma/client";

export const CreateInviteSchema = {
  body: z.looseObject({
    email: z.email("Invalid email address"),
    role: z.enum(UserRole).default(UserRole.COACH),
    teamId: z.uuid().optional().nullable(),
    requiresSso: z.boolean().optional().default(false),
  }),
};

export const AcceptInviteSchema = {
  body: z.looseObject({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    timezone: z.string().optional(),
  }),
};

export const ValidateInviteSchema = {
  body: z.object({
    token: z.string().min(1, "Token is required"),
  }),
};

export const ListInvitesSchema = {
  query: z.object({
    status: z.enum(["PENDING", "ACCEPTED", "EXPIRED", "REVOKED"]).optional(),
    role: z.enum(UserRole).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
  }),
};

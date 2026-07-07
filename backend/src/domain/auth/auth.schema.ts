import { z } from "zod";
import { UserRole } from "@prisma/client";

export const LoginSchema = {
  body: z
    .object({
      email: z.email("Invalid email address").trim(),
      password: z.string().trim().min(1, "Password is required"),
    })
    .strip(),
};

export const RegisterSchema = {
  body: z
    .object({
      firstName: z.string().trim().min(1, "First name is required"),
      lastName: z.string().trim().min(1, "Last name is required"),
      email: z.email("Invalid email address").trim(),
      password: z.string().trim().min(8, "Password must be at least 8 characters"),
      timezone: z.string().trim().default("UTC"),
      role: z.enum(UserRole).optional(),
      phoneNumber: z.string().trim().optional(),
      avatarUrl: z
        .string()
        .trim()
        .refine((u) => {
          try {
            return new URL(u).protocol === "https:";
          } catch {
            return false;
          }
        }, "Avatar URL must be a valid HTTPS URL")
        .optional()
        .or(z.string().length(0)),
    })
    .strip(),
};

export const ResetPasswordRequestSchema = {
  body: z
    .object({
      email: z.email("Invalid email address").trim(),
    })
    .strip(),
};

export const ResetPasswordSchema = {
  body: z
    .object({
      token: z.string().trim().min(1, "Token is required"),
      newPassword: z.string().trim().min(8, "Password must be at least 8 characters"),
    })
    .strip(),
};

import { z } from "zod";
import { UserRole } from "@prisma/client";

export const LoginSchema = {
    body: z.object({
        email: z.string().trim().email("Invalid email address"),
        password: z.string().trim().min(1, "Password is required"),
    }).strip(),
};

export const RegisterSchema = {
    body: z.object({
        firstName: z.string().trim().min(1, "First name is required"),
        lastName: z.string().trim().min(1, "Last name is required"),
        email: z.string().trim().email("Invalid email address"),
        password: z.string().trim().min(8, "Password must be at least 8 characters"),
        timezone: z.string().trim().default("UTC"),
        role: z.nativeEnum(UserRole).optional(),
        phoneNumber: z.string().trim().optional(),
        avatarUrl: z.string().trim().url("Invalid avatar URL").optional().or(z.string().length(0)),
    }).strip(),
};

export const ResetPasswordRequestSchema = {
    body: z.object({
        email: z.string().trim().email("Invalid email address"),
    }).strip(),
};

export const ResetPasswordSchema = {
    body: z.object({
        token: z.string().trim().min(1, "Token is required"),
        newPassword: z.string().trim().min(8, "Password must be at least 8 characters"),
    }).strip(),
};

import { z } from "zod";
import { UserRole } from "@prisma/client";

const userIdSchema = z.object({
    userId: z.string().uuid("Invalid user ID"),
});

export const ListUsersSchema = {
    query: z.object({
        page: z.preprocess((val) => {
            const parsed = parseInt(String(val), 10);
            return isNaN(parsed) || parsed < 1 ? undefined : parsed;
        }, z.number().int().positive().default(1)),
        pageSize: z.preprocess((val) => {
            const parsed = parseInt(String(val), 10);
            return isNaN(parsed) || parsed < 1 ? undefined : parsed;
        }, z.number().int().positive().default(50)),
        limit: z.coerce.number().int().positive().optional(),
        search: z.string().optional(),
        role: z.nativeEnum(UserRole).optional(),
        isActive: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
    }).passthrough(),
};

export const CreateUserSchema = {
    body: z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.nativeEnum(UserRole).default(UserRole.COACH),
        phoneNumber: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().default("UTC"),
        zoomIsvLink: z.string().url().optional(),
    }).passthrough(),
};

export const UpdateUserSchema = {
    params: userIdSchema,
    body: z.object({
        firstName: z.string().trim().min(1, "First name cannot be empty").optional(),
        lastName: z.string().trim().min(1, "Last name cannot be empty").optional(),
        email: z.string().trim().email().optional(),
        password: z.string().trim().min(8, "Password must be at least 8 characters").optional(),
        role: z.nativeEnum(UserRole).optional(),
        phoneNumber: z.string().trim().optional().nullable(),
        country: z.string().trim().optional().nullable(),
        avatarUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
        timezone: z.string().trim().optional(),
        preferredLanguage: z.string().trim().optional(),
        isActive: z.boolean().optional(),
        zoomIsvLink: z.string().trim().url().optional().or(z.literal("")).nullable(),
        publicBookingSlug: z.string().trim().optional(),
    }).passthrough(),
};

export const UpdateMyProfileSchema = {
    body: z.object({
        firstName: z.string().trim().min(1, "First name cannot be empty").optional(),
        lastName: z.string().trim().min(1, "Last name cannot be empty").optional(),
        password: z.string().trim().min(8, "Password must be at least 8 characters").optional(),
        phoneNumber: z.string().trim().optional().nullable(),
        country: z.string().trim().optional().nullable(),
        avatarUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
        timezone: z.string().trim().optional(),
        preferredLanguage: z.string().trim().optional(),
        zoomIsvLink: z.string().trim().url().optional().or(z.literal("")).nullable(),
    }).passthrough(),
};

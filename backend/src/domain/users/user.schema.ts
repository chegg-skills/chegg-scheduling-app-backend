import { z } from "zod";
import { UserRole } from "@prisma/client";
import { isAllowedMeetingLinkHost } from "../../shared/utils/meetingLinkValidation";

const userIdSchema = z.object({
  userId: z.uuid("Invalid user ID"),
});

const MEETING_LINK_DOMAIN_ERROR = "Meeting link must be an https URL on an approved domain (e.g. zoom.us).";
const isBlankOrAllowedMeetingLink = (val: string | null | undefined) => !val || isAllowedMeetingLinkHost(val);

export const ListUsersSchema = {
  query: z.looseObject({
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
    role: z.enum(UserRole).optional(),
    isActive: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  }),
};

export const CreateUserSchema = {
  body: z.looseObject({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: z.enum(UserRole).default(UserRole.COACH),
    phoneNumber: z.string().optional(),
    country: z.string().optional(),
    timezone: z.string().default("UTC"),
    zoomIsvLink: z.string().url().optional().refine(isBlankOrAllowedMeetingLink, MEETING_LINK_DOMAIN_ERROR),
  }),
};

export const UpdateUserSchema = {
  params: userIdSchema,
  body: z.looseObject({
    firstName: z.string().trim().min(1, "First name cannot be empty").optional(),
    lastName: z.string().trim().min(1, "Last name cannot be empty").optional(),
    email: z.email().trim().optional(),
    password: z.string().trim().min(8, "Password must be at least 8 characters").optional(),
    role: z.enum(UserRole).optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    country: z.string().trim().optional().nullable(),
    avatarUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
    timezone: z.string().trim().optional(),
    preferredLanguage: z.string().trim().optional(),
    isActive: z.boolean().optional(),
    zoomIsvLink: z.string().trim().url().optional().or(z.literal("")).nullable().refine(isBlankOrAllowedMeetingLink, MEETING_LINK_DOMAIN_ERROR),
    zoomIsvLinkExpiresAt: z.coerce.date().optional().nullable(),
    zoomIsvLinkReminderDays: z.number().int().min(1).max(90).optional().nullable(),
    publicBookingSlug: z.string().trim().optional(),
  }),
};

export const UpdateMyProfileSchema = {
  body: z.looseObject({
    firstName: z.string().trim().min(1, "First name cannot be empty").optional(),
    lastName: z.string().trim().min(1, "Last name cannot be empty").optional(),
    password: z.string().trim().min(8, "Password must be at least 8 characters").optional(),
    phoneNumber: z.string().trim().optional().nullable(),
    country: z.string().trim().optional().nullable(),
    avatarUrl: z.string().trim().url().optional().or(z.literal("")).nullable(),
    timezone: z.string().trim().optional(),
    preferredLanguage: z.string().trim().optional(),
    zoomIsvLink: z.string().trim().url().optional().or(z.literal("")).nullable().refine(isBlankOrAllowedMeetingLink, MEETING_LINK_DOMAIN_ERROR),
    zoomIsvLinkExpiresAt: z.coerce.date().optional().nullable(),
    zoomIsvLinkReminderDays: z.number().int().min(1).max(90).optional().nullable(),
  }),
};

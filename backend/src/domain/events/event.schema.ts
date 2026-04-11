import { z } from "zod";
import { EventLocationType, EventBookingMode, AssignmentStrategy } from "@prisma/client";

// --- Base Schemas ---

const EventOfferingBase = z.object({
    key: z.string().trim().toLowerCase().transform(v => v.replace(/[^a-z0-9]+/g, "_")).optional(),
    name: z.string().trim().min(1, "Name is required").optional(),
    description: z.string().trim().optional().nullable(),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
});

const InteractionTypeBase = z.object({
    key: z.string().trim().toLowerCase().transform(v => v.replace(/[^a-z0-9]+/g, "_")).optional(),
    name: z.string().trim().min(1, "Name is required").optional(),
    description: z.string().trim().optional().nullable(),
    supportsRoundRobin: z.boolean().default(false),
    supportsMultipleHosts: z.boolean().default(false),
    minHosts: z.coerce.number().int().positive().default(1),
    maxHosts: z.coerce.number().int().positive().optional().nullable(),
    minParticipants: z.coerce.number().int().positive().default(1),
    maxParticipants: z.coerce.number().int().positive().optional().nullable(),
    supportsSimultaneousCoaches: z.boolean().default(false),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
    isActive: z.boolean().default(true),
});

const EventBase = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    offeringId: z.string().uuid("Invalid offering ID"),
    interactionTypeId: z.string().uuid("Invalid interaction type ID"),
    assignmentStrategy: z.nativeEnum(AssignmentStrategy).default(AssignmentStrategy.DIRECT),
    durationSeconds: z.coerce.number().int().positive().default(1800),
    locationType: z.nativeEnum(EventLocationType).default(EventLocationType.VIRTUAL),
    locationValue: z.string().default("Zoom"),
    isActive: z.boolean().default(true),
    bookingMode: z.nativeEnum(EventBookingMode).default(EventBookingMode.HOST_AVAILABILITY),
    allowedWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
    minimumNoticeMinutes: z.coerce.number().int().nonnegative().default(0),
    bufferAfterMinutes: z.coerce.number().int().nonnegative().default(0),
    minParticipantCount: z.coerce.number().int().nonnegative().optional().nullable(),
    maxParticipantCount: z.coerce.number().int().nonnegative().optional().nullable(),
    sessionLeadershipStrategy: z.string().optional(),
    fixedLeadHostId: z.string().uuid().optional().nullable(),
});

const EventScheduleSlotBase = z.object({
    startTime: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
    endTime: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
    capacity: z.coerce.number().int().nonnegative().optional().nullable(),
    isActive: z.boolean().default(true),
});

// --- Exported Schemas with Refinements ---

export const EventOfferingSchema = {
    body: EventOfferingBase.passthrough(),
};

export const InteractionTypeSchema = {
    body: InteractionTypeBase.refine(data => {
        if (!data.supportsMultipleHosts && data.minHosts > 1) return false;
        return true;
    }, { message: "minHosts cannot be > 1 when single host only", path: ["minHosts"] })
        .refine(data => {
            if (data.maxHosts != null && data.maxHosts < data.minHosts) return false;
            return true;
        }, { message: "maxHosts cannot be < minHosts", path: ["maxHosts"] })
        .refine(data => {
            if (data.maxParticipants != null && data.maxParticipants < data.minParticipants) return false;
            return true;
        }, { message: "maxParticipants cannot be < minParticipants", path: ["maxParticipants"] })
        .refine(data => {
            if (data.supportsRoundRobin && !data.supportsMultipleHosts) return false;
            return true;
        }, { message: "supportsRoundRobin requires supportsMultipleHosts to be true.", path: ["supportsRoundRobin"] })
        .refine(data => {
            if (data.supportsMultipleHosts && data.maxHosts != null && data.maxHosts < 2) return false;
            return true;
        }, { message: "When supportsMultipleHosts is true, maxHosts must be at least 2 or null.", path: ["maxHosts"] })
        .refine(data => {
            if (data.supportsSimultaneousCoaches && !data.supportsMultipleHosts) return false;
            return true;
        }, { message: "supportsSimultaneousCoaches requires supportsMultipleHosts to be true.", path: ["supportsSimultaneousCoaches"] })
        .passthrough(),
};

export const CreateEventSchema = {
    params: z.object({
        teamId: z.string().uuid("Invalid team ID"),
    }),
    body: EventBase.passthrough(),
};

export const UpdateEventSchema = {
    params: z.object({
        eventId: z.string().uuid("Invalid event ID"),
    }),
    body: EventBase.partial().passthrough(),
};

export const ReplaceEventHostsSchema = {
    body: z.object({
        hosts: z.array(z.object({
            userId: z.string().uuid("Invalid user ID"),
            hostOrder: z.coerce.number().int().positive().optional(),
        })),
    }).passthrough(),
};

export const EventScheduleSlotSchema = {
    body: EventScheduleSlotBase.refine(data => {
        return data.endTime > data.startTime;
    }, { message: "endTime must be after startTime", path: ["endTime"] }).passthrough(),
    partial: EventScheduleSlotBase.partial().passthrough(),
};

export const ListTeamEventsSchema = {
    params: z.object({
        teamId: z.string().uuid("Invalid team ID"),
    }),
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().default(10),
    }).passthrough(),
};

export const ListAllEventsSchema = {
    query: z.object({
        page: z.coerce.number().int().positive().default(1),
        pageSize: z.coerce.number().int().positive().default(10),
        teamId: z.string().uuid().optional(),
    }).passthrough(),
};

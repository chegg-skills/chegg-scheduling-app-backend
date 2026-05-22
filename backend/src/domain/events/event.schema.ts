import { z } from "zod";
import { EventLocationType, EventBookingMode, AssignmentStrategy } from "@prisma/client";
import {
  INTERACTION_TYPE_CAPS,
  INTERACTION_TYPE_KEYS,
  type InteractionType,
} from "../../shared/constants/interactionType";

// --- Base Schemas ---

const EventTypeBase = z.looseObject({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => v.replace(/[^a-z0-9]+/g, "_"))
    .optional(),
  name: z.string().trim().min(1, "Name is required").optional(),
  description: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

/**
 * Core event field shapes without defaults. Used directly for the update schema
 * so that absent fields parse as `undefined` rather than a Zod-supplied default.
 * This lets `resolveUpdateEventContext` distinguish "user did not send this field"
 * (→ fall back to existing DB value) from "user explicitly sent a new value".
 */
const EventBaseObjectCore = z.looseObject({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  eventTypeId: z.string().min(1, "Event Type is required"),
  interactionType: z.enum(INTERACTION_TYPE_KEYS),
  assignmentStrategy: z.enum(AssignmentStrategy),
  durationSeconds: z.coerce.number().int().positive(),
  locationType: z.enum(EventLocationType),
  locationValue: z.string(),
  isActive: z.boolean(),
  bookingMode: z.enum(EventBookingMode),
  allowedWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  minimumNoticeMinutes: z.coerce.number().int().nonnegative(),
  bufferAfterMinutes: z.coerce.number().int().nonnegative(),
  minParticipantCount: z.coerce.number().int().nonnegative().optional().nullable(),
  maxParticipantCount: z.coerce.number().int().nonnegative().optional().nullable(),
  minCoachCount: z.coerce.number().int().positive(),
  maxCoachCount: z.coerce.number().int().positive().optional().nullable(),
  sessionLeadershipStrategy: z.string().optional(),
  fixedLeadCoachId: z.preprocess(
    (val) => (val === "" ? null : val),
    z.uuid().optional().nullable(),
  ),
  targetCoHostCount: z.coerce.number().int().nonnegative().optional().nullable(),
  maxBookingWindowDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  showDescription: z.boolean().optional(),
  deferCoachReveal: z.boolean().optional(),
  allowStudentCoachChoice: z.boolean().optional(),
  groupId: z.preprocess(
    (val) => (val === "" ? null : val),
    z.uuid().nullable().optional(),
  ),
  weeklyAvailability: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
      }),
    )
    .optional(),
});

/**
 * Create-time schema: same fields but with sensible defaults so callers don't
 * have to repeat boilerplate values on every POST.
 */
const EventBaseObject = EventBaseObjectCore.extend({
  assignmentStrategy: z.enum(AssignmentStrategy).default(AssignmentStrategy.DIRECT),
  durationSeconds: z.coerce.number().int().positive().default(1800),
  locationType: z.enum(EventLocationType).default(EventLocationType.VIRTUAL),
  locationValue: z.string().optional().default(""),
  isActive: z.boolean().default(true),
  bookingMode: z.enum(EventBookingMode).default(EventBookingMode.COACH_AVAILABILITY),
  minimumNoticeMinutes: z.coerce.number().int().nonnegative().default(0),
  bufferAfterMinutes: z.coerce.number().int().nonnegative().default(0),
  minCoachCount: z.coerce.number().int().positive().default(1),
  deferCoachReveal: z.boolean().default(false),
});

/**
 * Reusable refinement logic for event interaction types and strategies.
 * Can be applied to both Create (full) and Update (partial) schemas.
 */
const refineEventConstraints = (data: any, ctx: z.RefinementCtx) => {
  // In partial updates, interactionType may be absent — skip caps-based checks
  const caps = data.interactionType
    ? INTERACTION_TYPE_CAPS[data.interactionType as InteractionType]
    : null;

  if (caps && !caps.multipleCoaches) {
    if (data.sessionLeadershipStrategy && data.sessionLeadershipStrategy !== "SINGLE_COACH") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sessionLeadershipStrategy"],
        message: "Only SINGLE_COACH leadership is supported for this interaction type.",
      });
    }
  }

  if (caps && !caps.multipleParticipants) {
    if (data.maxParticipantCount != null && data.maxParticipantCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxParticipantCount"],
        message: "This interaction type only supports 1 participant per session.",
      });
    }
  }

  // Single-coach group sessions (!multipleCoaches && multipleParticipants) must use
  // DIRECT assignment and FIXED_SLOTS booking mode. This applies to ONE_TO_MANY and any
  // future type with the same capability profile.
  if (caps && !caps.multipleCoaches && caps.multipleParticipants) {
    if (data.assignmentStrategy && data.assignmentStrategy !== AssignmentStrategy.DIRECT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignmentStrategy"],
        message: "Single-coach group sessions only support DIRECT assignment strategy.",
      });
    }
    if (data.bookingMode && data.bookingMode !== EventBookingMode.FIXED_SLOTS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bookingMode"],
        message: "Single-coach group sessions must use FIXED_SLOTS booking mode.",
      });
    }
  }

  if (
    data.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN &&
    data.minCoachCount !== undefined &&
    data.minCoachCount < 2
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minCoachCount"],
      message: "ROUND_ROBIN assignment requires at least 2 coaches.",
    });
  }

  if (data.sessionLeadershipStrategy === "FIXED_LEAD" && !data.fixedLeadCoachId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["fixedLeadCoachId"],
      message: "FIXED_LEAD strategy requires a fixed lead coach to be specified.",
    });
  }

  if (
    data.maxCoachCount != null &&
    data.maxCoachCount < (data.minCoachCount ?? 0) // Handle cases where min may be absent in updates
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxCoachCount"],
      message: "maxCoachCount cannot be less than minCoachCount.",
    });
  }

  // targetCoHostCount must be at least 1 when specified for multi-coach types
  if (
    caps &&
    caps.multipleCoaches &&
    data.targetCoHostCount != null &&
    data.targetCoHostCount < 1
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["targetCoHostCount"],
      message: "targetCoHostCount must be at least 1.",
    });
  }

  // deferCoachReveal is only valid for ONE_TO_MANY (single-coach group) events
  if (data.deferCoachReveal === true && caps) {
    if (caps.multipleCoaches || !caps.multipleParticipants) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deferCoachReveal"],
        message: "Deferred coach reveal is only supported for ONE_TO_MANY events.",
      });
    }
  }

  // allowStudentCoachChoice is only valid for ONE_TO_ONE events
  if (data.allowStudentCoachChoice === true && caps) {
    if (caps.multipleParticipants || caps.multipleCoaches) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allowStudentCoachChoice"],
        message: "Student coach choice is only supported for ONE_TO_ONE events.",
      });
    }
  }
};

const EventBase = EventBaseObject.superRefine(refineEventConstraints);

const EventScheduleSlotBase = z.looseObject({
  startTime: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  endTime: z.preprocess((val) => (typeof val === "string" ? new Date(val) : val), z.date()),
  capacity: z.coerce.number().int().nonnegative().optional().nullable(),
  assignedCoachId: z.uuid().optional().nullable(),
  isActive: z.boolean().default(true),
  isCancelled: z.boolean().default(false),
  recurrence: z
    .object({
      frequency: z.enum(["WEEKLY", "BI_WEEKLY", "MONTHLY", "TWICE_A_MONTH", "THRICE_A_WEEK"]),
      occurrences: z.coerce.number().int().min(1).max(50),
    })
    .optional()
    .nullable(),
});

// --- Exported Schemas with Refinements ---

export const EventTypeSchema = {
  body: EventTypeBase,
};

export const CreateEventSchema = {
  params: z.object({
    teamId: z.uuid("Invalid team ID"),
  }),
  body: EventBase,
};

export const UpdateEventSchema = {
  params: z.object({
    eventId: z.uuid("Invalid event ID"),
  }),
  // EventBaseObjectCore has no defaults, so absent fields stay undefined rather than
  // being silently replaced by a Zod default. This lets resolveUpdateEventContext
  // correctly fall back to the existing DB value for any field the caller omits.
  body: EventBaseObjectCore.partial().superRefine(refineEventConstraints),
};

export const ReplaceEventCoachesSchema = {
  body: z.looseObject({
      coaches: z.array(
        z.object({
          userId: z.uuid("Invalid user ID"),
          coachOrder: z.coerce.number().int().positive().optional(),
        }),
      ),
    }),
};

// Schemas below are already using Coach nomenclature

export const EventScheduleSlotSchema = {
  body: EventScheduleSlotBase.refine(
    (data) => {
      return data.endTime > data.startTime;
    },
    { message: "endTime must be after startTime", path: ["endTime"] },
  ),
  partial: EventScheduleSlotBase.partial(),
};

export const ListTeamEventsSchema = {
  params: z.object({
    teamId: z.uuid("Invalid team ID"),
  }),
  query: z.looseObject({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().default(10),
    }),
};

export const ListAllEventsSchema = {
  query: z.looseObject({
      page: z.coerce.number().int().positive().default(1),
      pageSize: z.coerce.number().int().positive().default(10),
      teamId: z.uuid().optional(),
    }),
};

export const UpsertSessionLogSchema = {
  params: z.object({
    eventId: z.uuid("Invalid event ID"),
    slotId: z.uuid("Invalid slot ID"),
  }),
  body: z.object({
    topicsDiscussed: z.string().trim().optional().nullable(),
    summary: z.string().trim().optional().nullable(),
    coachNotes: z.string().trim().optional().nullable(),
    attendance: z.array(
      z.object({
        bookingId: z.uuid("Invalid booking ID"),
        attended: z.boolean(),
      }),
    ),
  }),
};

export const RevealCoachSchema = {
  params: z.object({
    eventId: z.uuid("Invalid event ID"),
    slotId: z.uuid("Invalid slot ID"),
  }),
  body: z.object({
    coachUserId: z.uuid("Invalid coach user ID").optional(),
    sessionJoinUrl: z.string().url("Invalid URL").optional().nullable(),
  }),
};

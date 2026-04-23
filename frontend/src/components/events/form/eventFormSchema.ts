import { z } from 'zod'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import type { Event } from '@/types'

export const eventFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    offeringId: z.string().min(1, 'Event Category is required'),
    interactionType: z.enum(['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY'] as const),
    locationType: z.enum(['VIRTUAL', 'IN_PERSON', 'CUSTOM'] as const),
    locationValue: z.string().min(1, 'Location is required'),
    durationMinutes: z
      .number({ invalid_type_error: 'Enter a valid duration' })
      .min(1, 'Minimum 1 minute'),
    assignmentStrategy: z.enum(['DIRECT', 'ROUND_ROBIN'] as const).default('DIRECT'),
    targetCoHostCount: z.number().int().min(1).nullable().optional(),
    bookingMode: z.enum(['COACH_AVAILABILITY', 'FIXED_SLOTS'] as const).default('COACH_AVAILABILITY'),
    allowedWeekdays: z.array(z.number()).default([]),
    minimumNoticeMinutes: z.number().min(0).default(0),
    sessionLeadershipStrategy: z
      .enum(['SINGLE_COACH', 'FIXED_LEAD', 'ROTATING_LEAD'] as const)
      .default('SINGLE_COACH'),
    fixedLeadCoachId: z.string().nullable().optional(),
    minCoachCount: z.number().int().min(1, 'Minimum coaches must be at least 1').default(1),
    maxCoachCount: z
      .number()
      .int()
      .min(1, 'Maximum coaches must be at least 1')
      .nullable()
      .optional(),
    minParticipantCount: z
      .number()
      .int()
      .min(1, 'Minimum participants must be at least 1')
      .nullable()
      .optional(),
    maxParticipantCount: z
      .number()
      .int()
      .min(1, 'Maximum participants must be at least 1')
      .nullable()
      .optional(),
    bufferAfterMinutes: z.number().min(0).default(0),
    maxBookingWindowDays: z.number().int().min(1).max(365).nullable().optional(),
    showDescription: z.boolean().default(false),
    isActive: z.boolean().default(true),
    weeklyAvailability: z
      .array(
        z.object({
          dayOfWeek: z.number(),
          startTime: z.string(),
          endTime: z.string(),
        })
      )
      .default([]),
  })
  .superRefine((values, ctx) => {
    const caps = values.interactionType ? INTERACTION_TYPE_CAPS[values.interactionType] : null

    // ── Caps-based guards ─────────────────────────────────────────────────────

    if (caps && !caps.multipleCoaches) {
      // ONE_TO_ONE / ONE_TO_MANY: each session has exactly one coach, but the pool
      // can still have multiple coaches and round-robin rotates which one is picked.
      // What these types cannot have is multi-coach session leadership.
      if (values.sessionLeadershipStrategy && values.sessionLeadershipStrategy !== 'SINGLE_COACH') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sessionLeadershipStrategy'],
          message: 'Only single-coach leadership is supported for this interaction type.',
        })
      }
    }

    if (caps && !caps.multipleParticipants) {
      if (values.maxParticipantCount != null && values.maxParticipantCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['maxParticipantCount'],
          message: 'This interaction type only supports 1 participant per session.',
        })
      }
    }

    // ── Cross-field rules ─────────────────────────────────────────────────────

    if (values.assignmentStrategy === 'ROUND_ROBIN' && (values.minCoachCount ?? 1) < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['minCoachCount'],
        message: 'Round-robin assignment requires at least 2 coaches (set Min Coaches ≥ 2).',
      })
    }

    if (values.sessionLeadershipStrategy === 'FIXED_LEAD' && !values.fixedLeadCoachId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixedLeadCoachId'],
        message: 'A fixed lead coach must be selected for this leadership strategy.',
      })
    }

    if (
      values.maxCoachCount != null &&
      values.maxCoachCount < (values.minCoachCount ?? 1)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxCoachCount'],
        message: 'Maximum coaches cannot be less than minimum coaches.',
      })
    }

    if (
      values.minParticipantCount != null &&
      values.maxParticipantCount != null &&
      values.maxParticipantCount < values.minParticipantCount
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Maximum participants cannot be less than minimum participants.',
        path: ['maxParticipantCount'],
      })
    }
  })

export type EventFormValues = z.infer<typeof eventFormSchema>

export function getEventFormDefaults(event?: Event): Partial<EventFormValues> {
  if (event) {
    return {
      name: event.name,
      description: event.description ?? '',
      offeringId: event.offeringId,
      interactionType: event.interactionType,
      locationType: event.locationType,
      locationValue: event.locationValue ?? '',
      durationMinutes: Math.floor(event.durationSeconds / 60),
      assignmentStrategy: event.assignmentStrategy,
      bookingMode: event.bookingMode,
      allowedWeekdays: event.allowedWeekdays,
      minimumNoticeMinutes: event.minimumNoticeMinutes,
      sessionLeadershipStrategy: event.sessionLeadershipStrategy,
      fixedLeadCoachId: event.fixedLeadCoachId,
      minCoachCount: event.minCoachCount,
      maxCoachCount: event.maxCoachCount,
      targetCoHostCount: event.targetCoHostCount,
      minParticipantCount: event.minParticipantCount,
      maxParticipantCount: event.maxParticipantCount,
      bufferAfterMinutes: event.bufferAfterMinutes,
      maxBookingWindowDays: event.maxBookingWindowDays,
      showDescription: event.showDescription,
      isActive: event.isActive,
      weeklyAvailability: (event.weeklyAvailability || []).map((a) => ({
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    }
  }

  return {
    name: '',
    description: '',
    offeringId: '',
    interactionType: 'ONE_TO_ONE',
    locationType: 'VIRTUAL',
    locationValue: '',
    durationMinutes: 60,
    assignmentStrategy: 'DIRECT',
    bookingMode: 'COACH_AVAILABILITY',
    allowedWeekdays: [],
    minimumNoticeMinutes: 0,
    sessionLeadershipStrategy: 'SINGLE_COACH',
    fixedLeadCoachId: null,
    minCoachCount: 1,
    maxCoachCount: null,
    targetCoHostCount: null,
    minParticipantCount: null,
    maxParticipantCount: null,
    bufferAfterMinutes: 15,
    maxBookingWindowDays: null,
    showDescription: false,
    isActive: true,
    weeklyAvailability: [],
  }
}

import { z } from 'zod'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import { MeetingLinkSourceValues } from '@/types/generated/enums'
import type { Event } from '@/types'

export const eventFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    eventTypeId: z.string().min(1, 'Event Type is required'),
    interactionType: z.enum(['ONE_TO_ONE', 'ONE_TO_MANY', 'MANY_TO_ONE', 'MANY_TO_MANY'] as const),
    locationType: z.enum(['VIRTUAL', 'IN_PERSON', 'CUSTOM'] as const),
    locationValue: z.string().optional().default(''),
    durationMinutes: z
      .number({ invalid_type_error: 'Enter a valid duration' })
      .min(1, 'Minimum 1 minute'),
    assignmentStrategy: z.enum(['DIRECT', 'ROUND_ROBIN'] as const).default('DIRECT'),
    targetCoHostCount: z.number().int().min(1).nullable().optional(),
    bookingMode: z
      .enum(['COACH_AVAILABILITY', 'FIXED_SLOTS'] as const)
      .default('COACH_AVAILABILITY'),
    minimumNoticeMinutes: z.number().min(0).default(0),
    sessionLeadershipStrategy: z
      .enum(['SINGLE_COACH', 'FIXED_LEAD', 'ROTATING_LEAD'] as const)
      .default('SINGLE_COACH'),
    fixedLeadCoachId: z.string().nullable().optional(),
    maxParticipantCount: z
      .number()
      .int()
      .min(1, 'Maximum participants must be at least 1')
      .nullable()
      .optional(),
    bufferAfterMinutes: z.number().min(0).default(0),
    maxBookingWindowDays: z.number().int().min(1).max(365).nullable().optional(),
    showDescription: z.boolean().default(false),
    deferCoachReveal: z.boolean().default(false),
    allowAnonymousBooking: z.boolean().default(false),
    allowStudentCoachChoice: z.boolean().default(false),
    meetingLinkSource: z.enum(MeetingLinkSourceValues).default('COACH_ISV'),
    isActive: z.boolean().default(true),
    groupId: z.string().uuid().nullable().optional(),
    recurrenceVisibilityLimit: z
      .number()
      .int()
      .min(1, 'Visibility limit must be at least 1')
      .nullable()
      .optional(),
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

    if (values.sessionLeadershipStrategy === 'FIXED_LEAD' && !values.fixedLeadCoachId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fixedLeadCoachId'],
        message: 'A fixed lead coach must be selected for this leadership strategy.',
      })
    }

    if (values.allowAnonymousBooking && values.deferCoachReveal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['allowAnonymousBooking'],
        message: 'Anonymous booking and deferred coach reveal cannot both be enabled.',
      })
    }

    if (values.allowAnonymousBooking && values.meetingLinkSource !== 'EVENT_LOCATION') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['meetingLinkSource'],
        message: 'Anonymous booking requires the Event Location URL as the meeting link source.',
      })
    }

    if (values.allowAnonymousBooking && !values.locationValue?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationValue'],
        message: 'Location value is required when anonymous booking is enabled so students receive booking details.',
      })
    }
  })

export type EventFormValues = z.infer<typeof eventFormSchema>

export function getEventFormDefaults(event?: Event): Partial<EventFormValues> {
  if (event) {
    return {
      name: event.name,
      description: event.description ?? '',
      eventTypeId: event.eventTypeId,
      interactionType: event.interactionType,
      locationType: event.locationType,
      locationValue: event.locationValue ?? '',
      durationMinutes: Math.floor(event.durationSeconds / 60),
      assignmentStrategy: event.assignmentStrategy,
      bookingMode: event.bookingMode,
      minimumNoticeMinutes: event.minimumNoticeMinutes / 60,
      sessionLeadershipStrategy: event.sessionLeadershipStrategy,
      fixedLeadCoachId: event.fixedLeadCoachId,
      targetCoHostCount: event.targetCoHostCount,
      maxParticipantCount: event.maxParticipantCount,
      bufferAfterMinutes: event.bufferAfterMinutes,
      maxBookingWindowDays: event.maxBookingWindowDays,
      showDescription: event.showDescription,
      deferCoachReveal: event.deferCoachReveal ?? false,
      allowAnonymousBooking: event.allowAnonymousBooking ?? false,
      allowStudentCoachChoice: event.allowStudentCoachChoice ?? false,
      meetingLinkSource: event.meetingLinkSource ?? 'COACH_ISV',
      isActive: event.isActive,
      groupId: event.groupId ?? null,
      recurrenceVisibilityLimit: event.recurrenceVisibilityLimit ?? null,
    }
  }

  return {
    name: '',
    description: '',
    eventTypeId: '',
    interactionType: 'ONE_TO_ONE',
    locationType: 'VIRTUAL',
    locationValue: '',
    durationMinutes: 60,
    assignmentStrategy: 'DIRECT',
    bookingMode: 'COACH_AVAILABILITY',
    minimumNoticeMinutes: 0,
    sessionLeadershipStrategy: 'SINGLE_COACH',
    fixedLeadCoachId: null,
    targetCoHostCount: null,
    maxParticipantCount: null,
    bufferAfterMinutes: 15,
    maxBookingWindowDays: null,
    showDescription: false,
    deferCoachReveal: false,
    allowAnonymousBooking: false,
    allowStudentCoachChoice: false,
    meetingLinkSource: 'COACH_ISV' as const,
    isActive: true,
    groupId: null,
    recurrenceVisibilityLimit: null,
  }
}

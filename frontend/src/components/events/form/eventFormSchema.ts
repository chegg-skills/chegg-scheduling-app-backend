import { z } from 'zod'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import { MeetingLinkSourceValues } from '@/types/generated/enums'
import type { Event } from '@/types'

export const eventFormSchema = z
  .object({
    teamId: z.string().optional(),
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
    locationLinkExpiresAt: z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => {
          if (!val) return true
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          return new Date(val) >= today
        },
        { message: 'Link expiry date must be today or in the future.' }
      ),
    locationLinkReminderDays: z.number().int().min(1).max(90).nullable().optional(),
    isActive: z.boolean().default(true),
    groupId: z.string().uuid().nullable().optional(),
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

    if (caps && !caps.multipleCoaches && !caps.multipleParticipants) {
      if (values.bookingMode && values.bookingMode !== 'COACH_AVAILABILITY') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['bookingMode'],
          message: 'One-to-one sessions must use coach availability booking mode.',
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

    if (values.locationType === 'VIRTUAL') {
      if (values.meetingLinkSource === 'EVENT_LOCATION' && !values.locationValue?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['locationValue'],
          message: 'Event Link is required.',
        })
      } else if (values.locationValue?.trim()) {
        try {
          const url = new URL(values.locationValue.trim())
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['locationValue'],
              message: 'Meeting link must be an http or https URL.',
            })
          }
        } catch {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['locationValue'],
            message: 'Please enter a valid URL (e.g. https://zoom.us/j/...).',
          })
        }
      }
    }

    if (values.locationType === 'IN_PERSON' && !values.locationValue?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationValue'],
        message: 'In-person address is required.',
      })
    }

    if (values.locationType === 'CUSTOM' && !values.locationValue?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationValue'],
        message: 'Custom instructions are required.',
      })
    }

    if (values.locationLinkExpiresAt && !values.locationValue?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationLinkExpiresAt'],
        message: 'A meeting link or location is required to set an expiry date.',
      })
    }

    if (values.locationLinkExpiresAt && !values.locationLinkReminderDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationLinkReminderDays'],
        message: 'Please specify the number of days before expiration to send the reminder.',
      })
    }

    if (!values.locationLinkExpiresAt && values.locationLinkReminderDays) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['locationLinkExpiresAt'],
        message: 'Please specify the link expiration date.',
      })
    }
  })

export type EventFormValues = z.infer<typeof eventFormSchema>

export function getEventFormDefaults(event?: Event): Partial<EventFormValues> {
  if (event) {
    return {
      teamId: event.teamId,
      name: event.name,
      description: event.description ?? '',
      eventTypeId: event.eventTypeId ?? '',
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
      locationLinkExpiresAt: event.locationLinkExpiresAt
        ? (() => {
          const dt = new Date(event.locationLinkExpiresAt as string)
          const y = dt.getUTCFullYear()
          const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
          const d = String(dt.getUTCDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        })()
        : null,
      locationLinkReminderDays: event.locationLinkReminderDays ?? null,
      isActive: event.isActive,
      groupId: event.groupId ?? null,
    }
  }

  return {
    teamId: '',
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
    locationLinkExpiresAt: null,
    locationLinkReminderDays: null,
    isActive: true,
    groupId: null,
  }
}

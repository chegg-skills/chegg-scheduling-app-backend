import { z } from 'zod'
import type { Event } from '@/types'

export const eventFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    offeringId: z.string().min(1, 'Event Category is required'),
    interactionTypeId: z.string().min(1, 'Interaction type is required'),
    locationType: z.enum(['VIRTUAL', 'IN_PERSON', 'CUSTOM'] as const),
    locationValue: z.string().min(1, 'Location is required'),
    durationMinutes: z
      .number({ invalid_type_error: 'Enter a valid duration' })
      .min(1, 'Minimum 1 minute'),
    assignmentStrategy: z.enum(['DIRECT', 'ROUND_ROBIN'] as const).optional(),
    bookingMode: z.enum(['HOST_AVAILABILITY', 'FIXED_SLOTS'] as const).default('HOST_AVAILABILITY'),
    allowedWeekdays: z.array(z.number()).default([]),
    minimumNoticeMinutes: z.number().min(0).default(0),
    sessionLeadershipStrategy: z
      .enum(['SINGLE_HOST', 'FIXED_LEAD', 'ROTATING_LEAD'] as const)
      .default('SINGLE_HOST'),
    fixedLeadHostId: z.string().nullable().optional(),
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
    isActive: z.boolean().default(true),
  })
  .superRefine((values, context) => {
    if (
      values.minParticipantCount !== null &&
      values.minParticipantCount !== undefined &&
      values.maxParticipantCount !== null &&
      values.maxParticipantCount !== undefined &&
      values.maxParticipantCount < values.minParticipantCount
    ) {
      context.addIssue({
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
      interactionTypeId: event.interactionTypeId,
      locationType: event.locationType,
      locationValue: event.locationValue ?? '',
      durationMinutes: Math.floor(event.durationSeconds / 60),
      assignmentStrategy: event.assignmentStrategy,
      bookingMode: event.bookingMode,
      allowedWeekdays: event.allowedWeekdays,
      minimumNoticeMinutes: event.minimumNoticeMinutes,
      sessionLeadershipStrategy: event.sessionLeadershipStrategy,
      fixedLeadHostId: event.fixedLeadHostId,
      minParticipantCount: event.minParticipantCount,
      maxParticipantCount: event.maxParticipantCount,
      bufferAfterMinutes: event.bufferAfterMinutes,
      isActive: event.isActive,
    }
  }

  return {
    name: '',
    description: '',
    offeringId: '',
    interactionTypeId: '',
    locationType: 'VIRTUAL',
    locationValue: '',
    durationMinutes: 60,
    assignmentStrategy: 'DIRECT',
    bookingMode: 'HOST_AVAILABILITY',
    allowedWeekdays: [],
    minimumNoticeMinutes: 0,
    sessionLeadershipStrategy: 'SINGLE_HOST',
    fixedLeadHostId: null,
    minParticipantCount: null,
    maxParticipantCount: null,
    bufferAfterMinutes: 15,
    isActive: true,
  }
}

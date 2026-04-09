import { z } from 'zod'
import type { EventInteractionType } from '@/types'

export const interactionTypeFormSchema = z
  .object({
    key: z.string().min(1, 'Key is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    supportsMultipleHosts: z.boolean().optional(),
    supportsRoundRobin: z.boolean().optional(),
    supportsSimultaneousCoaches: z.boolean().optional(),
    minHosts: z.coerce.number().int().min(1).optional(),
    maxHosts: z.preprocess(
      (value) => {
        if (typeof value === 'string' && value.trim() === '') return null
        if (value === null || value === undefined) return null
        if (typeof value === 'number') return value

        const parsedValue = Number(value)
        return Number.isNaN(parsedValue) ? null : parsedValue
      },
      z.number().int().min(1, 'If set, must be at least 1').nullable(),
    ).optional(),
    minParticipants: z.coerce.number().int().min(1).optional(),
    maxParticipants: z.preprocess(
      (value) => {
        if (typeof value === 'string' && value.trim() === '') return null
        if (value === null || value === undefined) return null
        if (typeof value === 'number') return value

        const parsedValue = Number(value)
        return Number.isNaN(parsedValue) ? null : parsedValue
      },
      z.number().int().min(1, 'If set, must be at least 1').nullable(),
    ).optional(),
    sortOrder: z.coerce.number().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((values, context) => {
    const minHosts = values.minHosts ?? 1
    const maxHosts = values.maxHosts ?? null
    const minParticipants = values.minParticipants ?? 1
    const maxParticipants = values.maxParticipants ?? null

    if (values.supportsRoundRobin && !values.supportsMultipleHosts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Round Robin requires Coach Pool to be enabled.',
        path: ['supportsRoundRobin'],
      })
    }

    if (values.supportsSimultaneousCoaches && !values.supportsMultipleHosts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Co-hosting requires Coach Pool to be enabled.',
        path: ['supportsSimultaneousCoaches'],
      })
    }

    if (!values.supportsMultipleHosts && minHosts !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Single-coach interaction types must keep Min Hosts at 1.',
        path: ['minHosts'],
      })
    }

    if (!values.supportsMultipleHosts && maxHosts !== null && maxHosts !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Single-host interaction types must keep Max Hosts at 1.',
        path: ['maxHosts'],
      })
    }

    if (values.supportsMultipleHosts && maxHosts !== null && maxHosts < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Multi-host interaction types need Max Hosts of at least 2.',
        path: ['maxHosts'],
      })
    }

    if (maxHosts !== null && maxHosts < minHosts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max Hosts cannot be less than Min Hosts.',
        path: ['maxHosts'],
      })
    }

    if (maxParticipants !== null && maxParticipants < minParticipants) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Max Participants cannot be less than Min Participants.',
        path: ['maxParticipants'],
      })
    }
  })

export type InteractionTypeFormValues = z.infer<typeof interactionTypeFormSchema>

export function getInteractionTypeFormDefaults(
  interactionType?: EventInteractionType,
): InteractionTypeFormValues {
  return {
    key: interactionType?.key ?? '',
    name: interactionType?.name ?? '',
    description: interactionType?.description ?? '',
    supportsMultipleHosts: interactionType?.supportsMultipleHosts ?? false,
    supportsRoundRobin: interactionType?.supportsRoundRobin ?? false,
    supportsSimultaneousCoaches: interactionType?.supportsSimultaneousCoaches ?? false,
    minHosts: interactionType?.minHosts ?? 1,
    maxHosts: interactionType?.maxHosts ?? null,
    minParticipants: interactionType?.minParticipants ?? 1,
    maxParticipants: interactionType?.maxParticipants ?? null,
    sortOrder: interactionType?.sortOrder ?? 0,
    isActive: interactionType?.isActive ?? true,
  }
}

import { z } from 'zod'
import type { EventInteractionType } from '@/types'

export const interactionTypeFormSchema = z
  .object({
    key: z.string().min(1, 'Key is required'),
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    supportsMultipleHosts: z.boolean().optional(),
    supportsRoundRobin: z.boolean().optional(),
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
  })
  .refine((values) => !values.supportsRoundRobin || values.supportsMultipleHosts, {
    message: 'Round Robin requires Multiple Hosts to be enabled',
    path: ['supportsRoundRobin'],
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
    minHosts: interactionType?.minHosts ?? 1,
    maxHosts: interactionType?.maxHosts ?? null,
    minParticipants: interactionType?.minParticipants ?? 1,
    maxParticipants: interactionType?.maxParticipants ?? null,
    sortOrder: interactionType?.sortOrder ?? 0,
  }
}

import { z } from 'zod'
import type { Event } from '@/types'

export const eventFormSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    offeringId: z.string().min(1, 'Offering is required'),
    interactionTypeId: z.string().min(1, 'Interaction type is required'),
    locationType: z.enum(['VIRTUAL', 'IN_PERSON', 'CUSTOM'] as const),
    locationValue: z.string().min(1, 'Location is required'),
    durationMinutes: z.number({ invalid_type_error: 'Enter a valid duration' }).min(1, 'Minimum 1 minute'),
    assignmentStrategy: z.enum(['DIRECT', 'ROUND_ROBIN'] as const),
    isActive: z.boolean().default(true),
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
        isActive: true,
    }
}

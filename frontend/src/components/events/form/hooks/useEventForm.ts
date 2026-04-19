import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventFormSchema, getEventFormDefaults, type EventFormValues } from '../eventFormSchema'
import {
  getAllowedAssignmentStrategies,
  getDefaultEventAssignmentStrategy,
  getRequiredEventCoachCount,
} from '../eventCapabilityRules'
import { useCreateEvent, useUpdateEvent } from '@/hooks/queries/useEvents'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import type { Event, InteractionType, InteractionTypeCaps } from '@/types'

interface UseEventFormProps {
  teamId: string
  event?: Event
  onSuccess?: () => void
}

export function useEventForm({ teamId, event, onSuccess }: UseEventFormProps) {
  const isEdit = !!event
  const { mutate: create, isPending: creating, error: createError } = useCreateEvent(teamId)
  const { mutate: update, isPending: updating, error: updateError } = useUpdateEvent()

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    values: getEventFormDefaults(event) as EventFormValues,
    defaultValues: getEventFormDefaults(),
  })

  const { watch, setValue, getValues, reset } = form

  const selectedInteractionTypeKey = watch('interactionType') as InteractionType | undefined
  const caps: InteractionTypeCaps | null = selectedInteractionTypeKey
    ? INTERACTION_TYPE_CAPS[selectedInteractionTypeKey]
    : null

  const selectedAssignmentStrategy =
    watch('assignmentStrategy') || getDefaultEventAssignmentStrategy(caps)
  const bookingModeSelection = watch('bookingMode')
  const requiredCoachCount = getRequiredEventCoachCount(caps, selectedAssignmentStrategy)

  useEffect(() => {
    if (!caps) return

    // Guard against stale caps: when react-hook-form's `values` prop sync resets the form
    // atomically, getValues() reflects the new interaction type before `watch` re-renders and
    // updates `caps`. Running resets with mismatched caps incorrectly clears fields like
    // sessionLeadershipStrategy/targetCoHostCount for multi-coach types on initial edit load.
    const currentInteractionType = getValues('interactionType') as InteractionType | undefined
    const currentCaps = currentInteractionType ? INTERACTION_TYPE_CAPS[currentInteractionType] : null
    if (currentCaps !== caps) return

    // Reset assignment strategy if the current one is not allowed for this type
    const allowedStrategies = getAllowedAssignmentStrategies(caps)
    const currentStrategy = getValues('assignmentStrategy')
    if (!currentStrategy || !allowedStrategies.includes(currentStrategy)) {
      setValue('assignmentStrategy', getDefaultEventAssignmentStrategy(caps), {
        shouldDirty: false,
      })
    }

    // Reset session-leadership and co-host fields when switching to a single-coach-per-session type.
    // Pool size (minCoachCount / maxCoachCount) is intentionally kept — single-session types can
    // still have a pool of coaches for round-robin rotation.
    if (!caps.multipleCoaches) {
      setValue('sessionLeadershipStrategy', 'SINGLE_COACH', { shouldDirty: false })
      // Keep fixedLeadCoachId when DIRECT — it stores the designated coach for the event.
      // Only clear it when switching away from DIRECT (ROUND_ROBIN doesn't use a fixed coach).
      if (getValues('assignmentStrategy') !== 'DIRECT') {
        setValue('fixedLeadCoachId', null, { shouldDirty: false })
      }
      setValue('targetCoHostCount', null, { shouldDirty: false })
    }

    // ONE_TO_MANY logic: Force FIXED_SLOTS mode.
    const isOneToMany = !caps.multipleCoaches && caps.multipleParticipants
    if (isOneToMany) {
      setValue('bookingMode', 'FIXED_SLOTS', { shouldDirty: false })
    }

    // Reset participant capacity when switching to a single-participant type
    if (!caps.multipleParticipants) {
      setValue('minParticipantCount', null, { shouldDirty: false })
      setValue('maxParticipantCount', null, { shouldDirty: false })
    }

    // Ensure multi-coach interaction types (Panels) do not use 'SINGLE_COACH' strategy.
    // If switching to a collaborative type, default to 'ROTATING_LEAD'.
    if (caps.multipleCoaches && getValues('sessionLeadershipStrategy') === 'SINGLE_COACH') {
      setValue('sessionLeadershipStrategy', 'ROTATING_LEAD', { shouldDirty: false })
    }
  }, [caps, getValues, setValue])

  function onSubmit(values: EventFormValues) {
    const apiPayload = {
      ...values,
      assignmentStrategy:
        values.assignmentStrategy || getDefaultEventAssignmentStrategy(caps),
      durationSeconds: values.durationMinutes * 60,
    }

    // @ts-ignore - durationMinutes is not in API but we handled it
    delete apiPayload.durationMinutes

    if (isEdit && event) {
      update({ eventId: event.id, data: apiPayload as any }, { onSuccess })
    } else {
      create(apiPayload as any, {
        onSuccess: () => {
          reset()
          onSuccess?.()
        },
      })
    }
  }

  return {
    form,
    onSubmit,
    isPending: creating || updating,
    error: createError ?? updateError,
    caps,
    selectedAssignmentStrategy,
    bookingModeSelection,
    requiredCoachCount,
    isEdit,
  }
}

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventFormSchema, getEventFormDefaults, type EventFormValues } from '../eventFormSchema'
import {
  clampEventParticipantConfig,
  getAllowedAssignmentStrategies,
  getDefaultEventAssignmentStrategy,
  getRequiredEventHostCount,
} from '../eventCapabilityRules'
import { useCreateEvent, useUpdateEvent } from '@/hooks/queries/useEvents'
import { useInteractionTypes } from '@/hooks/queries/useInteractionTypes'
import type { Event } from '@/types'

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

  const selectedInteractionTypeId = watch('interactionTypeId')
  const { data: interactionData } = useInteractionTypes()
  const selectedInteractionType = useMemo(
    () =>
      (interactionData?.interactionTypes ?? []).find(
        (item) => item.id === selectedInteractionTypeId
      ) ?? null,
    [interactionData, selectedInteractionTypeId]
  )

  const selectedAssignmentStrategy =
    watch('assignmentStrategy') ?? getDefaultEventAssignmentStrategy(selectedInteractionType)
  const bookingModeSelection = watch('bookingMode')
  const requiredHostCount = getRequiredEventHostCount(
    selectedInteractionType,
    selectedAssignmentStrategy
  )

  useEffect(() => {
    if (!selectedInteractionType) return

    const allowedStrategies = getAllowedAssignmentStrategies(selectedInteractionType)
    const currentStrategy = getValues('assignmentStrategy')

    if (!currentStrategy || !allowedStrategies.includes(currentStrategy)) {
      setValue('assignmentStrategy', getDefaultEventAssignmentStrategy(selectedInteractionType), {
        shouldDirty: false,
      })
    }

    const nextParticipantConfig = clampEventParticipantConfig(selectedInteractionType, {
      minParticipantCount: getValues('minParticipantCount'),
      maxParticipantCount: getValues('maxParticipantCount'),
    })

    if (getValues('minParticipantCount') !== nextParticipantConfig.minParticipantCount) {
      setValue('minParticipantCount', nextParticipantConfig.minParticipantCount, {
        shouldDirty: false,
      })
    }

    if (getValues('maxParticipantCount') !== nextParticipantConfig.maxParticipantCount) {
      setValue('maxParticipantCount', nextParticipantConfig.maxParticipantCount, {
        shouldDirty: false,
      })
    }
  }, [getValues, selectedInteractionType, setValue])

  function onSubmit(values: EventFormValues) {
    const apiPayload = {
      ...values,
      assignmentStrategy:
        values.assignmentStrategy ?? getDefaultEventAssignmentStrategy(selectedInteractionType),
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
    selectedInteractionType,
    selectedAssignmentStrategy,
    bookingModeSelection,
    requiredHostCount,
    isEdit,
  }
}

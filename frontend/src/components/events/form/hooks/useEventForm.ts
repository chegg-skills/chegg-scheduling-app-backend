import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  teamId?: string
  event?: Event
  accessedFromEventsTab?: boolean
  onSuccess?: () => void
}

export function useEventForm({ teamId, event, accessedFromEventsTab, onSuccess }: UseEventFormProps) {
  const isEdit = !!event
  const { mutate: create, isPending: creating, error: createError } = useCreateEvent()
  const { mutate: update, isPending: updating, error: updateError } = useUpdateEvent()

  const schema = useMemo(() => {
    return eventFormSchema.superRefine((values, ctx) => {
      if (!isEdit && accessedFromEventsTab && !values.teamId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['teamId'],
          message: 'Team is required',
        })
      }
    })
  }, [isEdit, accessedFromEventsTab])

  const form = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    values: {
      ...getEventFormDefaults(event),
      teamId: event?.teamId ?? teamId ?? '',
    } as EventFormValues,
    defaultValues: {
      ...getEventFormDefaults(),
      teamId: teamId ?? '',
    } as EventFormValues,
  })

  const { watch, setValue, getValues, reset } = form

  const selectedInteractionTypeKey = watch('interactionType') as InteractionType | undefined
  const caps: InteractionTypeCaps | null = selectedInteractionTypeKey
    ? INTERACTION_TYPE_CAPS[selectedInteractionTypeKey]
    : null

  const watchedAssignmentStrategy = watch('assignmentStrategy')
  const watchedAllowStudentCoachChoice = watch('allowStudentCoachChoice')
  const watchedAllowAnonymousBooking = watch('allowAnonymousBooking')
  const watchedDeferCoachReveal = watch('deferCoachReveal')
  const selectedAssignmentStrategy =
    watchedAssignmentStrategy || getDefaultEventAssignmentStrategy(caps)
  const bookingModeSelection = watch('bookingMode')
  const requiredCoachCount = getRequiredEventCoachCount(caps, selectedAssignmentStrategy)

  useEffect(() => {
    if (!caps) return

    // Guard against stale caps: when react-hook-form's `values` prop sync resets the form
    // atomically, getValues() reflects the new interaction type before `watch` re-renders and
    // updates `caps`. Running resets with mismatched caps incorrectly clears fields like
    // sessionLeadershipStrategy/targetCoHostCount for multi-coach types on initial edit load.
    const currentInteractionType = getValues('interactionType') as InteractionType | undefined
    const currentCaps = currentInteractionType
      ? INTERACTION_TYPE_CAPS[currentInteractionType]
      : null
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

    // Group Workshop logic (ONE_TO_MANY / MANY_TO_MANY): Force FIXED_SLOTS mode.
    const isGroupSession = caps.multipleParticipants
    if (isGroupSession) {
      setValue('bookingMode', 'FIXED_SLOTS', { shouldDirty: false })
    } else if (!caps.multipleCoaches) {
      // ONE_TO_ONE: Force COACH_AVAILABILITY.
      setValue('bookingMode', 'COACH_AVAILABILITY', { shouldDirty: false })
    }

    // Reset participant capacity when switching to a single-participant type
    if (!caps.multipleParticipants) {
      setValue('maxParticipantCount', null, { shouldDirty: false })
    }

    // Reset student coach choice when switching to an interaction type that doesn't support it
    if (caps.multipleCoaches || caps.multipleParticipants) {
      setValue('allowStudentCoachChoice', false, { shouldDirty: false })
    }

    // Reset anonymous booking and deferred coach reveal for types that don't support them
    if (caps.multipleCoaches || !caps.multipleParticipants) {
      setValue('allowAnonymousBooking', false, { shouldDirty: false })
      setValue('deferCoachReveal', false, { shouldDirty: false })
    }

    // Ensure multi-coach interaction types (Panels) do not use 'SINGLE_COACH' strategy.
    // If switching to a collaborative type, default to 'ROTATING_LEAD'.
    if (caps.multipleCoaches && getValues('sessionLeadershipStrategy') === 'SINGLE_COACH') {
      setValue('sessionLeadershipStrategy', 'ROTATING_LEAD', { shouldDirty: false })
    }

    // Multi-coach Smart Strategy Reform: Derive leadership from assignment strategy for types
    // where derivesLeadershipFromAssignment is true (currently MANY_TO_ONE / MANY_TO_MANY).
    if (caps.derivesLeadershipFromAssignment) {
      const assignment = getValues('assignmentStrategy')
      const targetLeadership = assignment === 'DIRECT' ? 'FIXED_LEAD' : 'ROTATING_LEAD'
      if (getValues('sessionLeadershipStrategy') !== targetLeadership) {
        setValue('sessionLeadershipStrategy', targetLeadership, { shouldDirty: true })
      }
    }

    // Reset assignment strategy when student choice is active
    const allowStudentCoachChoice = getValues('allowStudentCoachChoice')
    if (allowStudentCoachChoice) {
      if (getValues('assignmentStrategy') !== 'DIRECT') {
        setValue('assignmentStrategy', 'DIRECT', { shouldDirty: false })
      }
    }
  }, [caps, getValues, setValue, watchedAssignmentStrategy, watchedAllowStudentCoachChoice])

  // Mutual exclusivity: enabling one anonymous-mode toggle clears the other.
  // Also force meetingLinkSource to EVENT_LOCATION when anonymous booking is on.
  useEffect(() => {
    if (watchedAllowAnonymousBooking) {
      setValue('deferCoachReveal', false, { shouldDirty: false })
      setValue('meetingLinkSource', 'EVENT_LOCATION', { shouldDirty: false })
    }
  }, [watchedAllowAnonymousBooking, setValue])

  useEffect(() => {
    if (watchedDeferCoachReveal) {
      setValue('allowAnonymousBooking', false, { shouldDirty: false })
    }
  }, [watchedDeferCoachReveal, setValue])

  function onSubmit(values: EventFormValues) {
    const isEventLocationLink =
      (values.locationType === 'VIRTUAL' || values.locationType === 'CUSTOM') &&
      values.meetingLinkSource === 'EVENT_LOCATION'

    const apiPayload = {
      ...values,
      minimumNoticeMinutes: Math.round((values.minimumNoticeMinutes || 0) * 60),
      fixedLeadCoachId: values.fixedLeadCoachId || null,
      assignmentStrategy: values.assignmentStrategy || getDefaultEventAssignmentStrategy(caps),
      durationSeconds: values.durationMinutes * 60,
      locationLinkExpiresAt: isEventLocationLink ? values.locationLinkExpiresAt : null,
      locationLinkReminderDays: isEventLocationLink ? values.locationLinkReminderDays : null,
    }

    // @ts-ignore - durationMinutes is not in API but we handled it
    delete apiPayload.durationMinutes
    // @ts-ignore - teamId is in form schema but not API payload schema
    delete apiPayload.teamId

    if (isEdit && event) {
      update(
        { eventId: event.id, data: apiPayload as any },
        {
          onSuccess: () => {
            onSuccess?.()
          },
        }
      )
    } else {
      const targetTeamId = (accessedFromEventsTab && !isEdit) ? values.teamId : (teamId || values.teamId)
      if (!targetTeamId) {
        return
      }
      create(
        { teamId: targetTeamId, data: apiPayload as any },
        {
          onSuccess: () => {
            reset()
            onSuccess?.()
          },
        }
      )
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

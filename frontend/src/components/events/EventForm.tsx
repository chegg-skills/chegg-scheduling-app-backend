import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { EventBasicFields } from './EventBasicFields'
import { EventLocationFields } from './EventLocationFields'
import { EventScheduleFields } from './EventScheduleFields'
import { EventResourceFields } from './EventResourceFields'
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents'
import { extractApiError } from '@/utils/apiError'
import type { Event } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  offeringId: z.string().min(1, 'Offering is required'),
  interactionTypeId: z.string().min(1, 'Interaction type is required'),
  locationType: z.enum(['VIRTUAL', 'IN_PERSON', 'CUSTOM'] as const),
  locationValue: z.string().min(1, 'Location is required'),
  durationSeconds: z.number({ invalid_type_error: 'Enter a valid duration' }).min(60, 'Minimum 1 minute'),
  assignmentStrategy: z.enum(['DIRECT', 'ROUND_ROBIN'] as const),
})

export type EventFormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventFormProps {
  teamId: string
  event?: Event
  onSuccess?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventForm({ teamId, event, onSuccess }: EventFormProps) {
  const isEdit = !!event
  const { mutate: create, isPending: creating, error: createError } = useCreateEvent(teamId)
  const { mutate: update, isPending: updating, error: updateError } = useUpdateEvent()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: event?.name ?? '',
      description: event?.description ?? '',
      offeringId: event?.offeringId ?? '',
      interactionTypeId: event?.interactionTypeId ?? '',
      locationType: event?.locationType ?? 'VIRTUAL',
      locationValue: event?.locationValue ?? '',
      durationSeconds: event ? event.durationSeconds : 3600,
      assignmentStrategy: event?.assignmentStrategy ?? 'DIRECT',
    },
  })

  useEffect(() => {
    if (event) {
      reset({
        name: event.name,
        description: event.description ?? '',
        offeringId: event.offeringId,
        interactionTypeId: event.interactionTypeId,
        locationType: event.locationType,
        locationValue: event.locationValue,
        durationSeconds: event.durationSeconds,
        assignmentStrategy: event.assignmentStrategy,
      })
    }
  }, [event, reset])

  function onSubmit(values: EventFormValues) {
    if (isEdit && event) {
      update({ eventId: event.id, data: values }, { onSuccess })
    } else {
      create(values, {
        onSuccess: () => {
          reset()
          onSuccess?.()
        },
      })
    }
  }

  const isPending = creating || updating
  const error = createError ?? updateError

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={4}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Basic Info
          </Typography>
          <EventBasicFields register={register} errors={errors} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Resources
          </Typography>
          <EventResourceFields register={register} errors={errors} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Location
          </Typography>
          <EventLocationFields register={register} errors={errors} watch={watch} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, display: 'block', mb: 1 }}>
            Schedule
          </Typography>
          <EventScheduleFields register={register} errors={errors} />
        </Stack>

        <Stack direction="row" justifyContent="flex-end" sx={{ pt: 1 }}>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create event'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

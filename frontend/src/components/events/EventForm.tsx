import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { z } from 'zod'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
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
  durationMinutes: z.number({ invalid_type_error: 'Enter a valid duration' }).min(1, 'Minimum 1 minute'),
  assignmentStrategy: z.enum(['DIRECT', 'ROUND_ROBIN'] as const),
  isActive: z.boolean().default(true),
})

export type EventFormValues = z.infer<typeof schema>

// ─── Props ────────────────────────────────────────────────────────────────────

interface EventFormProps {
  teamId: string
  event?: Event
  onSuccess?: () => void
  onCancel?: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventForm({ teamId, event, onSuccess, onCancel }: EventFormProps) {
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
    values: event ? {
      name: event.name,
      description: event.description ?? '',
      offeringId: event.offeringId,
      interactionTypeId: event.interactionTypeId,
      locationType: event.locationType,
      locationValue: event.locationValue ?? '',
      durationMinutes: Math.floor(event.durationSeconds / 60),
      assignmentStrategy: event.assignmentStrategy,
      isActive: event.isActive,
    } : undefined,
    defaultValues: {
      name: '',
      description: '',
      offeringId: '',
      interactionTypeId: '',
      locationType: 'VIRTUAL',
      locationValue: '',
      durationMinutes: 60,
      assignmentStrategy: 'DIRECT',
      isActive: true,
    },
  })

  function onSubmit(values: EventFormValues) {
    const apiPayload = {
      ...values,
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
          <EventResourceFields register={register} errors={errors} watch={watch} />
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
          <EventScheduleFields register={register} errors={errors} watch={watch} />
        </Stack>

        <Divider />

        <Box sx={{ py: 1 }}>
          <FormControlLabel
            label="Event is Active"
            control={
              <Switch
                defaultChecked={event?.isActive ?? true}
                {...register('isActive')}
              />
            }
          />
        </Box>

        <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isPending} sx={{ minWidth: 160 }}>
            {isEdit ? 'Save changes' : 'Create event'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

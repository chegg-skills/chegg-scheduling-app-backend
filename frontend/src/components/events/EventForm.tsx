import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import { Button } from '@/components/shared/Button'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { EventBasicFields } from './EventBasicFields'
import { EventLocationFields } from './EventLocationFields'
import { EventScheduleFields } from './EventScheduleFields'
import { EventResourceFields } from './EventResourceFields'
import { eventFormSchema, getEventFormDefaults, type EventFormValues } from './eventFormSchema'
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents'
import { extractApiError } from '@/utils/apiError'
import type { Event } from '@/types'

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
    resolver: zodResolver(eventFormSchema),
    values: getEventFormDefaults(event) as EventFormValues,
    defaultValues: getEventFormDefaults(),
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

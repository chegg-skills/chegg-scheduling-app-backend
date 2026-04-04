import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { EventBasicFields } from './EventBasicFields'
import { EventLocationFields } from './EventLocationFields'
import { EventScheduleFields } from './EventScheduleFields'
import { EventSchedulingPolicyFields } from './EventSchedulingPolicyFields'
import { EventResourceFields } from './EventResourceFields'
import { EventAssignmentAlert } from './EventAssignmentAlert'
import { EventFormSubmitActions } from './EventFormSubmitActions'
import { useEventForm } from './hooks/useEventForm'
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
  const {
    form,
    onSubmit,
    isPending,
    error,
    selectedInteractionType,
    selectedAssignmentStrategy,
    bookingModeSelection,
    requiredHostCount,
    isEdit,
  } = useEventForm({ teamId, event, onSuccess })

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = form

  const sectionLabelStyle = {
    variant: 'overline',
    color: 'text.secondary',
    sx: { fontWeight: 700, display: 'block', mb: 1 },
  } as const

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate spacing={4}>
        {error && <ErrorAlert message={extractApiError(error)} />}

        <Stack spacing={2}>
          <Typography {...sectionLabelStyle}>Basic Info</Typography>
          <EventBasicFields register={register} errors={errors} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography {...sectionLabelStyle}>Resources</Typography>
          <EventResourceFields register={register} errors={errors} watch={watch} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography {...sectionLabelStyle}>Location</Typography>
          <EventLocationFields register={register} errors={errors} watch={watch} />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography {...sectionLabelStyle}>Schedule & Assignment</Typography>
          <EventScheduleFields
            register={register}
            errors={errors}
            watch={watch}
            selectedInteractionType={selectedInteractionType}
          />
        </Stack>

        <Divider />

        <Stack spacing={2}>
          <Typography {...sectionLabelStyle}>Booking Rules & Policy</Typography>
          <EventSchedulingPolicyFields
            register={register}
            errors={errors}
            watch={watch}
            control={control}
            selectedInteractionType={selectedInteractionType}
          />
        </Stack>

        <EventAssignmentAlert
          selectedInteractionType={selectedInteractionType}
          requiredHostCount={requiredHostCount}
          selectedAssignmentStrategy={selectedAssignmentStrategy}
          bookingModeSelection={bookingModeSelection}
        />

        <Divider />

        <EventFormSubmitActions
          register={register}
          isPending={isPending}
          isEdit={isEdit}
          onCancel={onCancel}
          defaultActive={event?.isActive ?? true}
        />
      </Stack>
    </Box>
  )
}

import { FormProvider } from 'react-hook-form'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventBasicFields } from './EventBasicFields'
import { EventLocationFields } from './EventLocationFields'
import { EventScheduleFields } from './EventScheduleFields'
import { EventSchedulingPolicyFields } from './EventSchedulingPolicyFields'
import { EventResourceFields } from './EventResourceFields'
import { EventAssignmentAlert } from '../EventAssignmentAlert'
import { EventFormSubmitActions } from './EventFormSubmitActions'
import { useEventForm } from './hooks/useEventForm'
import { useTeamMembers } from '@/hooks/queries/useTeamMembers'
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

/**
 * Main form component for creating or editing Events.
 * Utilizes FormProvider to share form state with child field components,
 * eliminating prop-drilling of register, errors, and control.
 */
export function EventForm({ teamId, event, onSuccess, onCancel }: EventFormProps) {
  const { data: teamMembersData } = useTeamMembers(teamId)
  const teamMembers = teamMembersData?.members ?? []
  const {
    form,
    onSubmit,
    isPending,
    error,
    caps,
    selectedAssignmentStrategy,
    bookingModeSelection,
    requiredCoachCount,
    isEdit,
  } = useEventForm({ teamId, event, onSuccess })

  const sectionLabelStyle = {
    variant: 'overline',
    color: 'text.secondary',
    sx: { fontWeight: 700, display: 'block', mb: 1 },
  } as const

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', width: '100%' }}>
      <FormProvider {...form}>
        <Stack component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate spacing={4}>
          {error && <ErrorAlert message={extractApiError(error)} />}

          <Stack spacing={2}>
            <Typography {...sectionLabelStyle}>Basic info</Typography>
            <EventBasicFields />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography {...sectionLabelStyle}>Booking rules & policy</Typography>
            <EventSchedulingPolicyFields caps={caps} />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography {...sectionLabelStyle}>Location</Typography>
            <EventLocationFields />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography {...sectionLabelStyle}>Resources</Typography>
            <EventResourceFields />
          </Stack>

          <Divider />

          <Stack spacing={2}>
            <Typography {...sectionLabelStyle}>Schedule & assignment</Typography>
            <EventScheduleFields caps={caps} event={event} teamMembers={teamMembers} />
          </Stack>

          <EventAssignmentAlert
            caps={caps}
            requiredCoachCount={requiredCoachCount}
            selectedAssignmentStrategy={selectedAssignmentStrategy}
            bookingModeSelection={bookingModeSelection}
          />

          <Divider />

          <EventFormSubmitActions
            isPending={isPending}
            isEdit={isEdit}
            onCancel={onCancel}
            defaultActive={event?.isActive ?? true}
          />
        </Stack>
      </FormProvider>
    </Box>
  )
}

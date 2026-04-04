import type { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import type { EventFormValues } from './eventFormSchema'
import { getAllowedAssignmentStrategies, getDefaultEventAssignmentStrategy } from './eventCapabilityRules'
import type { EventInteractionType } from '@/types'

interface Props {
  register: UseFormRegister<EventFormValues>
  errors: FieldErrors<EventFormValues>
  watch: UseFormWatch<EventFormValues>
  selectedInteractionType?: EventInteractionType | null
}

/** Handles duration and event-level assignment behavior within the interaction type envelope. */
export function EventScheduleFields({ register, errors, watch, selectedInteractionType }: Props) {
  const assignmentOptions = getAllowedAssignmentStrategies(selectedInteractionType)
  const selectedStrategy = watch('assignmentStrategy') ?? getDefaultEventAssignmentStrategy(selectedInteractionType)
  const canChooseStrategy = assignmentOptions.length > 1

  return (
    <Stack spacing={2}>
      <FormField
        label="Duration (minutes)"
        htmlFor="durationMinutes"
        error={errors.durationMinutes?.message}
        info="How long the event will last (e.g., 60 for one hour)."
        required
      >
        <Input
          id="durationMinutes"
          type="number"
          min="1"
          hasError={!!errors.durationMinutes}
          {...register('durationMinutes', { valueAsNumber: true })}
        />
      </FormField>

      {canChooseStrategy ? (
        <FormField
          label="Assignment Strategy"
          htmlFor="assignmentStrategy"
          error={errors.assignmentStrategy?.message}
          info="The selected interaction type supports both direct and round-robin assignment, so choose the behavior for this event."
        >
          <Select
            id="assignmentStrategy"
            value={selectedStrategy}
            hasError={!!errors.assignmentStrategy}
            {...register('assignmentStrategy')}
          >
            <MenuItem value="DIRECT">Direct — pick from this event&apos;s hosts</MenuItem>
            <MenuItem value="ROUND_ROBIN">Round Robin — rotate across eligible hosts</MenuItem>
          </Select>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Round-robin events still need at least two hosts to be assigned later.
          </Typography>
        </FormField>
      ) : (
        <FormField
          label="Assignment Strategy"
          htmlFor="assignmentStrategyLocked"
          info="This interaction type only supports direct assignment for events."
        >
          <Input
            id="assignmentStrategyLocked"
            value={selectedInteractionType ? 'Direct' : 'Select an interaction type first'}
            disabled
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {selectedInteractionType
              ? 'Switch to an interaction type with round-robin capability if this event should rotate between hosts.'
              : 'Choose an interaction type to see the assignment options available for this event.'}
          </Typography>
        </FormField>
      )}
    </Stack>
  )
}

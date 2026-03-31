import type { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import type { EventFormValues } from './EventForm'
import type { AssignmentStrategy } from '@/types'

interface Props {
  register: UseFormRegister<EventFormValues>
  errors: FieldErrors<EventFormValues>
  watch: UseFormWatch<EventFormValues>
}

const STRATEGIES: { value: AssignmentStrategy; label: string }[] = [
  { value: 'DIRECT', label: 'Direct — always use first host' },
  { value: 'ROUND_ROBIN', label: 'Round Robin — rotate among hosts' },
]

/** Handles durationSeconds and assignmentStrategy */
export function EventScheduleFields({ register, errors, watch }: Props) {
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

      <FormField
        label="Assignment Strategy"
        htmlFor="assignmentStrategy"
        error={errors.assignmentStrategy?.message}
        info="How hosts are assigned to this event: Direct (always the same host) or Round Robin (rotating among hosts)."
        hint="Round Robin requires the selected interaction type to support it."
      >
        <Select
          id="assignmentStrategy"
          hasError={!!errors.assignmentStrategy}
          value={watch('assignmentStrategy') || ''}
          {...register('assignmentStrategy')}
        >
          {STRATEGIES.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormField>
    </Stack>
  )
}

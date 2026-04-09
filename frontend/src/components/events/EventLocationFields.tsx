import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { Select } from '@/components/shared/Select'
import type { EventFormValues } from './eventFormSchema'
import type { EventLocationType } from '@/types'

const LOCATION_TYPES: { value: EventLocationType; label: string }[] = [
  { value: 'VIRTUAL', label: 'Virtual (URL)' },
  { value: 'IN_PERSON', label: 'In Person (Address)' },
  { value: 'CUSTOM', label: 'Custom' },
]

const locationHint: Record<EventLocationType, string> = {
  VIRTUAL: 'Paste a meeting link (e.g. Zoom, Teams).',
  IN_PERSON: 'Enter the physical address.',
  CUSTOM: 'Any custom location string.',
}

/** 
 * Handles locationType and locationValue fields.
 * Consumes the EventForm context.
 */
export function EventLocationFields() {
  const { register, watch, formState: { errors } } = useFormContext<EventFormValues>()
  const locationType = watch('locationType')

  return (
    <Stack spacing={2}>
      <FormField
        label="Location Type"
        htmlFor="locationType"
        error={errors.locationType?.message}
        info="The format of the meeting (Virtual link, Physical address, etc.)."
        required
      >
        <Select
          id="locationType"
          hasError={!!errors.locationType}
          value={locationType || ''}
          {...register('locationType')}
        >
          {LOCATION_TYPES.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Location"
        htmlFor="locationValue"
        error={errors.locationValue?.message}
        info="The actual link, address, or custom instructions for the meeting."
        hint={locationType ? locationHint[locationType] : undefined}
        required
      >
        <Input
          id="locationValue"
          hasError={!!errors.locationValue}
          {...register('locationValue')}
        />
      </FormField>
    </Stack>
  )
}

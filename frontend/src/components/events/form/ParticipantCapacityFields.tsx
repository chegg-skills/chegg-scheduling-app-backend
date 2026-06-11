import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import type { EventFormValues } from './eventFormSchema'

/**
 * Handles participant capacity limit for events that support multiple participants.
 * Only rendered when the selected interaction type has multipleParticipants = true.
 * Consumes the EventForm context.
 */
export function ParticipantCapacityFields() {
  const {
    control,
    formState: { errors },
  } = useFormContext<EventFormValues>()

  return (
    <FormField
      label="Participant Capacity"
      htmlFor="maxParticipantCount"
      error={errors.maxParticipantCount?.message}
      info="Maximum number of students allowed per session. Leave empty for no cap."
    >
      <Controller
        name="maxParticipantCount"
        control={control}
        render={({ field }) => (
          <Input
            id="maxParticipantCount"
            type="number"
            min={1}
            placeholder="No cap"
            value={field.value ?? ''}
            hasError={!!errors.maxParticipantCount}
            onChange={(e) => {
              const { value } = e.target
              field.onChange(value === '' ? null : Number(value))
            }}
            onBlur={field.onBlur}
          />
        )}
      />
    </FormField>
  )
}

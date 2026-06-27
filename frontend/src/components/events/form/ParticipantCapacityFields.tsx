import { Controller, useFormContext } from 'react-hook-form'
import { FormField } from '@/components/shared/form/FormField'
import { QuickSelectInput } from '@/components/shared/form/QuickSelectInput'
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
          <QuickSelectInput
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
            name={field.name}
            ref={field.ref}
            options={[
              { label: 'No Cap', value: null },
              { label: '5', value: 5 },
              { label: '10', value: 10 },
              { label: '15', value: 15 },
              { label: '20', value: 20 },
              { label: '25', value: 25 },
              { label: '30', value: 30 },
            ]}
          />
        )}
      />
    </FormField>
  )
}


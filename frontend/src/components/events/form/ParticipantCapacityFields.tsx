import { Controller, useFormContext } from 'react-hook-form'
import Box from '@mui/material/Box'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import type { EventFormValues } from './eventFormSchema'

/**
 * Handles participant capacity limits for events that support multiple participants.
 * Only rendered when the selected interaction type has multipleParticipants = true.
 * Consumes the EventForm context.
 */
export function ParticipantCapacityFields() {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const currentMin = watch('minParticipantCount')

  return (
    <FormField
      label="Participant Capacity"
      htmlFor="minParticipantCount"
      error={errors.minParticipantCount?.message || errors.maxParticipantCount?.message}
      info="Set the minimum and maximum number of students allowed per session. Leave the max blank for no cap."
    >
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        }}
      >
        <Controller
          name="minParticipantCount"
          control={control}
          render={({ field }) => (
            <Input
              id="minParticipantCount"
              type="number"
              label="Minimum participants"
              min={1}
              value={field.value ?? ''}
              hasError={!!errors.minParticipantCount}
              onChange={(e) => {
                const { value } = e.target
                field.onChange(value === '' ? null : Number(value))
              }}
              onBlur={field.onBlur}
            />
          )}
        />

        <Controller
          name="maxParticipantCount"
          control={control}
          render={({ field }) => (
            <Input
              id="maxParticipantCount"
              type="number"
              label="Maximum participants"
              min={currentMin ?? 1}
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
      </Box>
    </FormField>
  )
}

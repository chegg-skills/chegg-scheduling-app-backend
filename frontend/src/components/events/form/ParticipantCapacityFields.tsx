import { Controller, useFormContext } from 'react-hook-form'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { formatCapacityRange } from './eventCapabilityRules'
import type { EventFormValues } from './eventFormSchema'
import type { EventInteractionType } from '@/types'

interface ParticipantCapacityFieldsProps {
  selectedInteractionType?: EventInteractionType | null
}

/**
 * Handles participant capacity limits.
 * Consumes the EventForm context.
 */
export function ParticipantCapacityFields({
  selectedInteractionType,
}: ParticipantCapacityFieldsProps) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const currentMinParticipants = watch('minParticipantCount')
  const participantRange = selectedInteractionType
    ? formatCapacityRange(
        selectedInteractionType.minParticipants,
        selectedInteractionType.maxParticipants
      )
    : 'Select an interaction type first'
  const participantChoicesLocked = Boolean(
    selectedInteractionType &&
    selectedInteractionType.maxParticipants === selectedInteractionType.minParticipants
  )

  return (
    <FormField
      label="Participant Capacity"
      htmlFor="minParticipantCount"
      error={errors.minParticipantCount?.message || errors.maxParticipantCount?.message}
      info="The interaction type defines the allowed envelope, and this event can choose the actual participant limits inside that range."
      hint={
        selectedInteractionType
          ? `Allowed range for this event: ${participantRange}. Leave the max blank to use the interaction type cap.`
          : 'Select an interaction type first to configure participant limits.'
      }
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
              min={selectedInteractionType?.minParticipants ?? 1}
              max={selectedInteractionType?.maxParticipants ?? undefined}
              value={field.value ?? ''}
              disabled={!selectedInteractionType || participantChoicesLocked}
              hasError={!!errors.minParticipantCount}
              onChange={(event) => {
                const { value } = event.target
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
              min={currentMinParticipants ?? selectedInteractionType?.minParticipants ?? 1}
              max={selectedInteractionType?.maxParticipants ?? undefined}
              placeholder={
                selectedInteractionType?.maxParticipants === null
                  ? 'No cap'
                  : 'Use interaction type cap'
              }
              value={field.value ?? ''}
              disabled={!selectedInteractionType || participantChoicesLocked}
              hasError={!!errors.maxParticipantCount}
              onChange={(event) => {
                const { value } = event.target
                field.onChange(value === '' ? null : Number(value))
              }}
              onBlur={field.onBlur}
            />
          )}
        />
      </Box>

      {participantChoicesLocked && selectedInteractionType ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          This interaction type uses a fixed participant count of{' '}
          {selectedInteractionType.minParticipants}, so the event cannot override it.
        </Typography>
      ) : null}
    </FormField>
  )
}

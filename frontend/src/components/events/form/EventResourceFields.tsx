import { useFormContext } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { toTitleCase } from '@/utils/toTitleCase'
import { useEventOfferings } from '@/hooks/queries/useEventOfferings'
import { useInteractionTypes } from '@/hooks/queries/useInteractionTypes'
import { formatCapacityRange } from './eventCapabilityRules'
import type { EventFormValues } from './eventFormSchema'

/**
 * Handles offeringId and interactionTypeId fields.
 * Consumes the EventForm context.
 */
export function EventResourceFields() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<EventFormValues>()
  const { data: offeringsData } = useEventOfferings()
  const { data: interactionData } = useInteractionTypes()

  const offerings = (offeringsData?.offerings ?? []).filter((o) => o.isActive)
  const interactionTypes = (interactionData?.interactionTypes ?? []).filter((t) => t.isActive)

  return (
    <Stack spacing={2}>
      <FormField
        label="Event category"
        htmlFor="offeringId"
        error={errors.offeringId?.message}
        info="The category or type of service for this event (e.g., Tutorial)."
        required
      >
        <Select
          id="offeringId"
          hasError={!!errors.offeringId}
          value={watch('offeringId') || ''}
          {...register('offeringId')}
        >
          <MenuItem value="">Select a category…</MenuItem>
          {offerings.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {toTitleCase(o.name)}
            </MenuItem>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Interaction type"
        htmlFor="interactionTypeId"
        error={errors.interactionTypeId?.message}
        info="The method of communication for the event (e.g., Zoom, In Person)."
        required
      >
        <Select
          id="interactionTypeId"
          hasError={!!errors.interactionTypeId}
          value={watch('interactionTypeId') || ''}
          {...register('interactionTypeId')}
        >
          <MenuItem value="">Select an interaction type…</MenuItem>
          {interactionTypes.map((t) => (
            <MenuItem key={t.id} value={t.id} sx={{ py: 1.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {toTitleCase(t.name)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Participants: {formatCapacityRange(t.minParticipants, t.maxParticipants)} •
                  Coaches: {formatCapacityRange(t.minHosts, t.maxHosts)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.supportsRoundRobin ? 'Supports round-robin roster' : 'Direct assignment only'}
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormField>
    </Stack>
  )
}

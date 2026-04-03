import type { UseFormRegister, FieldErrors, UseFormWatch } from 'react-hook-form'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import { FormField } from '@/components/shared/FormField'
import { Select } from '@/components/shared/Select'
import { useEventOfferings } from '@/hooks/useEventOfferings'
import { useInteractionTypes } from '@/hooks/useInteractionTypes'
import type { EventFormValues } from './eventFormSchema'

interface Props {
  register: UseFormRegister<EventFormValues>
  errors: FieldErrors<EventFormValues>
  watch: UseFormWatch<EventFormValues>
}

/** Handles offeringId and interactionTypeId */
export function EventResourceFields({ register, errors, watch }: Props) {
  const { data: offeringsData } = useEventOfferings()
  const { data: interactionData } = useInteractionTypes()

  const offerings = (offeringsData?.offerings ?? []).filter((o) => o.isActive)
  const interactionTypes = (interactionData?.interactionTypes ?? []).filter((t) => t.isActive)

  return (
    <Stack spacing={2}>
      <FormField
        label="Offering"
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
          <MenuItem value="">Select an offering…</MenuItem>
          {offerings.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name}
            </MenuItem>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Interaction Type"
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
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormField>
    </Stack>
  )
}

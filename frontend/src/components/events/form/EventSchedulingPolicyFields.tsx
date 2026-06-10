import Stack from '@mui/material/Stack'
import { useFormContext } from 'react-hook-form'
import { TimezoneSelectField } from '@/components/shared/form/TimezoneSelectField'
import type { InteractionTypeCaps } from '@/types'
import { BookingModeField } from './BookingModeField'
import { BookingWindowFields } from './BookingWindowFields'
import { DeferCoachRevealField } from './DeferCoachRevealField'
import { ParticipantCapacityFields } from './ParticipantCapacityFields'
import type { EventFormValues } from './eventFormSchema'

interface EventSchedulingPolicyFieldsProps {
  caps?: InteractionTypeCaps | null
  isLocked?: boolean
}

/**
 * Handles booking mode, timezone, notice, buffer, capacity, and coach-reveal fields.
 * Consumes the EventForm context — all sub-components read from it directly.
 */
export function EventSchedulingPolicyFields({ caps, isLocked }: EventSchedulingPolicyFieldsProps) {
  const { control } = useFormContext<EventFormValues>()

  return (
    <Stack spacing={3}>
      <BookingModeField caps={caps} />
      <TimezoneSelectField
        control={control}
        name="timezone"
        label="Scheduling timezone"
        hint="Schedule slots are created and displayed in this timezone."
      />
      <BookingWindowFields />
      {caps?.multipleParticipants && <ParticipantCapacityFields />}
      {caps?.multipleParticipants && !caps?.multipleCoaches && (
        <DeferCoachRevealField isLocked={isLocked} />
      )}
    </Stack>
  )
}

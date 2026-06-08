import Stack from '@mui/material/Stack'
import type { InteractionTypeCaps } from '@/types'
import { BookingModeField } from './BookingModeField'
import { BookingWindowFields } from './BookingWindowFields'
import { DeferCoachRevealField } from './DeferCoachRevealField'
import { ParticipantCapacityFields } from './ParticipantCapacityFields'
import { EventAvailabilityPicker } from './EventAvailabilityPicker'

interface EventSchedulingPolicyFieldsProps {
  caps?: InteractionTypeCaps | null
  isLocked?: boolean
}

/**
 * Handles booking mode, weekdays, notice, buffer, capacity, and coach-reveal fields.
 * Consumes the EventForm context — all sub-components read from it directly.
 */
export function EventSchedulingPolicyFields({ caps, isLocked }: EventSchedulingPolicyFieldsProps) {
  return (
    <Stack spacing={3}>
      <BookingModeField caps={caps} />
      <EventAvailabilityPicker />
      <BookingWindowFields />
      {caps?.multipleParticipants && <ParticipantCapacityFields />}
      {caps?.multipleParticipants && !caps?.multipleCoaches && (
        <DeferCoachRevealField isLocked={isLocked} />
      )}
    </Stack>
  )
}

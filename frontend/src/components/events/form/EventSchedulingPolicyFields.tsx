import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { InteractionTypeCaps } from '@/types'
import { BookingModeField } from './BookingModeField'
import { BookingWindowFields } from './BookingWindowFields'
import { DeferCoachRevealField } from './DeferCoachRevealField'
import { AllowAnonymousBookingField } from './AllowAnonymousBookingField'
import { ParticipantCapacityFields } from './ParticipantCapacityFields'

interface EventSchedulingPolicyFieldsProps {
  caps?: InteractionTypeCaps | null
  isLocked?: boolean
}

/**
 * Handles booking mode, notice, buffer, capacity, and coach-reveal fields.
 * Consumes the EventForm context — all sub-components read from it directly.
 */
export function EventSchedulingPolicyFields({ caps, isLocked }: EventSchedulingPolicyFieldsProps) {
  const isOneToMany = caps?.multipleParticipants && !caps?.multipleCoaches

  return (
    <Stack spacing={3}>
      <BookingModeField caps={caps} />
      <BookingWindowFields caps={caps} />
      {caps?.multipleParticipants && <ParticipantCapacityFields />}
      {isOneToMany && (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" color="text.secondary">
            Group booking behavior
          </Typography>
          <DeferCoachRevealField isLocked={isLocked} />
          <AllowAnonymousBookingField isLocked={isLocked} />
        </Stack>
      )}
    </Stack>
  )
}

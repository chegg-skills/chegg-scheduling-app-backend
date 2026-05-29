import { Stack } from '@mui/material'
import type { Booking } from '@/types'
import { EventTeamSection } from './sections/EventTeamSection'
import { InviteeSection } from './sections/InviteeSection'
import { LocationSection } from './sections/LocationSection'
import { ScheduleSection } from './sections/ScheduleSection'
import { CoachSection } from './sections/CoachSection'

interface BookingDetailsLeftSectionProps {
  booking: Booking
}

export function BookingDetailsLeftSection({ booking }: BookingDetailsLeftSectionProps) {
  return (
    <Stack spacing={2}>
      <EventTeamSection booking={booking} />
      <InviteeSection booking={booking} />
      <LocationSection booking={booking} />
      <ScheduleSection booking={booking} />
      <CoachSection booking={booking} />
    </Stack>
  )
}

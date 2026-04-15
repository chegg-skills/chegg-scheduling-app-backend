import { Divider, Stack, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import type { Booking } from '@/types'
import { getBookingMeetingJoinUrl } from './BookingDetailsPanel'
import { InviteeSection } from './sections/InviteeSection'
import { MeetingSection } from './sections/MeetingSection'
import { ScheduleSection } from './sections/ScheduleSection'
import { HostSection } from './sections/HostSection'

interface BookingDetailsLeftSectionProps {
  booking: Booking
  onViewHost?: (userId: string) => void
}

export function BookingDetailsLeftSection({ booking, onViewHost }: BookingDetailsLeftSectionProps) {
  const theme = useTheme()
  const meetingJoinUrl = getBookingMeetingJoinUrl(booking)

  return (
    <Stack spacing={3}>
      <InviteeSection booking={booking} />

      <Divider flexItem sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }} />

      <MeetingSection booking={booking} meetingJoinUrl={meetingJoinUrl} />

      <Divider flexItem sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }} />

      <ScheduleSection booking={booking} />

      <Divider flexItem sx={{ borderColor: alpha(theme.palette.secondary.main, 0.08) }} />

      <HostSection booking={booking} onViewHost={onViewHost} />
    </Stack>
  )
}

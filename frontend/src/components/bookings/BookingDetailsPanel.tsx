import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FileText } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingDetailsLeftSection } from './BookingDetailsLeftSection'
import { BookingDetailsRightSection } from './BookingDetailsRightSection'

interface BookingDetailsPanelProps {
  booking: Booking
}


export const getBookingMeetingJoinUrl = (booking: Booking): string | null => {
  const fallbackLocation = booking.event?.locationValue ?? ''

  return (
    booking.meetingJoinUrl
    ?? booking.host?.zoomIsvLink
    ?? (booking.event?.locationType === 'VIRTUAL' && fallbackLocation.startsWith('http')
      ? fallbackLocation
      : null)
  )
}

export function BookingDetailsPanel({ booking }: BookingDetailsPanelProps) {
  const theme = useTheme()

  return (
    <>
      <Typography
        variant="subtitle2"
        gutterBottom
        sx={{
          fontWeight: 700,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: theme.palette.secondary.main,
        }}
      >
        <FileText size={16} /> Session Details & Meeting Access
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        <BookingDetailsLeftSection booking={booking} />
        <BookingDetailsRightSection booking={booking} />
      </Box>
    </>
  )
}

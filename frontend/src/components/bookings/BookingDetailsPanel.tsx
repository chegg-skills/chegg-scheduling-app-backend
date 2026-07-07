import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FileText, AlertTriangle } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingDetailsLeftSection } from './BookingDetailsLeftSection'
import { BookingDetailsRightSection } from './BookingDetailsRightSection'

interface BookingDetailsPanelProps {
  booking: Booking
}

export const getBookingMeetingJoinUrl = (booking: Booking): string | null => {
  const fallbackLocation = booking.event?.locationValue ?? ''

  if (booking.event?.meetingLinkSource === 'SESSION_LANDING_PAGE') {
    return booking.meetingJoinUrl ?? null
  }

  if (booking.event?.meetingLinkSource === 'COACH_ISV') {
    // For FIXED_SLOTS, slot.assignedCoach is authoritative — booking.meetingJoinUrl may be
    // stale if the slot's coach was overridden before the cascade propagated.
    const slotLink = (booking.scheduleSlot as any)?.assignedCoach?.zoomIsvLink ?? null
    return slotLink ?? booking.meetingJoinUrl ?? (fallbackLocation || null)
  }

  return (
    booking.meetingJoinUrl ??
    booking.coach?.zoomIsvLink ??
    (booking.event?.locationType === 'VIRTUAL' && fallbackLocation.startsWith('http')
      ? fallbackLocation
      : null)
  )
}

export function BookingDetailsPanel({ booking }: BookingDetailsPanelProps) {
  const theme = useTheme()

  return (
    <>
      {booking.status === 'CANCELLED' && booking.cancellationReason && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'error.lighter',
            border: '1px solid',
            borderColor: 'error.light',
            borderRadius: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
          }}
        >
          <Box sx={{ color: 'error.main', mt: 0.25 }}>
            <AlertTriangle size={18} />
          </Box>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'error.dark' }}>
              Booking Cancelled
            </Typography>
            <Typography variant="body2" color="error.dark">
              <strong>Reason:</strong> {booking.cancellationReason}
            </Typography>
          </Box>
        </Box>
      )}

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


import { Box, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FileText, AlertTriangle } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingDetailsLeftSection } from './BookingDetailsLeftSection'
import { BookingDetailsRightSection } from './BookingDetailsRightSection'

interface BookingDetailsPanelProps {
  booking: Booking
}

// booking.meetingJoinUrl is now ALWAYS the student-facing join-redirect URL
// (`/api/public/bookings/:id/join`), for every meetingLinkSource — never the
// raw destination. The internal view always resolves the coach's direct link
// independently instead of trusting that field.
export const getBookingMeetingJoinUrl = (booking: Booking): string | null => {
  const fallbackLocation = booking.event?.locationValue ?? ''

  // For FIXED_SLOTS, slot.assignedCoach is authoritative — the booking's own
  // coach relation may be stale if the slot's coach was overridden before
  // the cascade propagated.
  const coachZoomLink = booking.scheduleSlot?.assignedCoach?.zoomIsvLink ?? booking.coach?.zoomIsvLink ?? null

  if (booking.event?.meetingLinkSource === 'COACH_ISV') {
    return coachZoomLink ?? (fallbackLocation || null)
  }

  // EVENT_LOCATION: the shared location link is authoritative — must match what the
  // student's join redirect actually resolves to (backend's getMeetingJoinUrl), or the
  // coach and student can end up joining different meeting rooms.
  const virtualLocationLink =
    booking.event?.locationType === 'VIRTUAL' && fallbackLocation.startsWith('http') ? fallbackLocation : null

  return virtualLocationLink ?? coachZoomLink
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


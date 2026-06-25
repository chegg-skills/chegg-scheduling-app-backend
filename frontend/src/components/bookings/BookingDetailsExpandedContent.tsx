import { Box, Button, Divider } from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { Clock, XCircle, Calendar, CalendarPlus } from 'lucide-react'
import type { Booking } from '@/types'
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate'
import { BookingDetailsPanel } from './BookingDetailsPanel'
import { CancelBookingDialog } from './CancelBookingDialog'
import { useAuth } from '@/context/auth/useAuth'

interface BookingDetailsExpandedContentProps {
  booking: Booking
  onFollowUpOpen?: () => void
}

export function BookingDetailsExpandedContent({ booking, onFollowUpOpen }: BookingDetailsExpandedContentProps) {
  const { user } = useAuth()
  const {
    handleStatusUpdate,
    canMarkNoShow,
    cancelBooking,
    setCancelBooking,
    handleCancelConfirm,
    isPending,
  } = useBookingStatusUpdate()

  return (
    <Box>
      <BookingDetailsPanel booking={booking} />

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box
          sx={{
            mr: 'auto',
            alignSelf: 'center',
            color: 'text.secondary',
            typography: 'caption',
            display: 'flex',
            flexDirection: 'column',
            gap: 0.25,
          }}
        >
          <Box sx={{ fontWeight: 600 }}>Booking ID: {booking.id.slice(0, 8).toUpperCase()}</Box>
          <Box>
            Created on{' '}
            {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(booking.createdAt)
            )}{' '}
            by {toTitleCase(booking.studentName)}
          </Box>
        </Box>

        {booking.status === 'CONFIRMED' && (
          <>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<XCircle size={16} />}
              onClick={() => handleStatusUpdate(booking, 'CANCELLED', 'Cancel')}
              sx={{ fontWeight: 600, borderRadius: 1.5 }}
            >
              Cancel Booking
            </Button>
            <Button
              variant="outlined"
              size="small"
              component="a"
              href={`/reschedule/${booking.id}${booking.rescheduleToken ? `?token=${booking.rescheduleToken}` : ''}`}
              target="_blank"
              startIcon={<Calendar size={16} />}
              sx={{
                fontWeight: 600,
                borderRadius: 1.5,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  bgcolor: 'primary.lighter',
                },
              }}
            >
              Reschedule
            </Button>
          </>
        )}

        {canMarkNoShow(booking) && (
          <Button
            variant="contained"
            color="warning"
            size="small"
            startIcon={<Clock size={16} />}
            onClick={() => handleStatusUpdate(booking, 'NO_SHOW', 'No Show')}
            sx={{ fontWeight: 600, borderRadius: 1.5 }}
          >
            Mark as No Show
          </Button>
        )}

        {booking.status === 'COMPLETED' &&
          user &&
          ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'].includes(user.role) && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CalendarPlus size={16} />}
              onClick={() => onFollowUpOpen?.()}
              sx={{
                fontWeight: 600,
                borderRadius: 1.5,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': {
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  bgcolor: 'primary.lighter',
                },
              }}
            >
              Follow-Up
            </Button>
          )}
      </Box>

      <CancelBookingDialog
        isOpen={!!cancelBooking}
        booking={cancelBooking}
        onClose={() => setCancelBooking(null)}
        onConfirm={handleCancelConfirm}
        isLoading={isPending}
      />
    </Box>
  )
}

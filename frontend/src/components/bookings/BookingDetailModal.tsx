import Box from '@mui/material/Box'
import { toTitleCase } from '@/utils/toTitleCase'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import { Clock, XCircle, Calendar } from 'lucide-react'
import type { Booking } from '@/types'
import { Modal } from '@/components/shared/ui/Modal'
import { BookingDetailsPanel } from './BookingDetailsPanel'
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate'

interface BookingDetailModalProps {
  booking: Booking | null
  onClose: () => void
}

export function BookingDetailModal({ booking, onClose }: BookingDetailModalProps) {
  const { handleStatusUpdate, canMarkNoShow } = useBookingStatusUpdate()

  if (!booking) return null

  return (
    <Modal
      isOpen={!!booking}
      onClose={onClose}
      title={`Booking details — ${toTitleCase(booking.studentName)}`}
      size="lg"
    >
      <Box sx={{ p: 1 }}>
        <BookingDetailsPanel booking={booking} />

        <Divider sx={{ my: 4 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, alignItems: 'center' }}>
          <Box
            sx={{
              mr: 'auto',
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
              )}
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
                sx={{ fontWeight: 600, borderRadius: 2 }}
              >
                Cancel booking
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
                  borderRadius: 2,
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
              onClick={() => handleStatusUpdate(booking, 'NO_SHOW', 'No show')}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Mark as no show
            </Button>
          )}

          <Button variant="contained" onClick={onClose} sx={{ fontWeight: 600, borderRadius: 2 }}>
            Close
          </Button>
        </Box>
      </Box>
    </Modal>
  )
}

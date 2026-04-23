import React from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import { format } from 'date-fns'
import { Modal } from '@/components/shared/ui/Modal'
import { Spinner } from '@/components/shared/ui/Spinner'
import { useSlotBookings } from '@/hooks/queries/useEvents'
import type { EventScheduleSlot, Booking } from '@/types'

interface SlotAttendeesDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  slot: EventScheduleSlot | null
}

export function SlotAttendeesDialog({ isOpen, onClose, eventId, slot }: SlotAttendeesDialogProps) {
  const { data: bookings, isLoading } = useSlotBookings(eventId, slot?.id || '')

  const dateStr = slot ? format(new Date(slot.startTime), 'EEE, MMM d, yyyy') : ''
  const timeStr = slot ? `${format(new Date(slot.startTime), 'h:mm a')} - ${format(new Date(slot.endTime), 'h:mm a')}` : ''

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Session Attendees"
      maxWidth="md"
    >
      <Box sx={{ mt: 1 }}>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Session Details
          </Typography>
          <Typography variant="body1" fontWeight={600}>
            {dateStr}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {timeStr}
          </Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Spinner />
          </Box>
        ) : !bookings || bookings.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
            <Typography color="text.secondary">No students have booked this session yet.</Typography>
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Student Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Booking Date</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookings.map((booking: any) => {
                  // Robust name resolution: Try studentName from booking, then fullName from student record
                  const displayName = booking.studentName || booking.student?.fullName || 'Anonymous Student'
                  const displayEmail = booking.studentEmail || booking.student?.email || 'N/A'
                  
                  return (
                    <TableRow key={booking.id}>
                      <TableCell sx={{ fontWeight: 500 }}>{displayName}</TableCell>
                      <TableCell>{displayEmail}</TableCell>
                      <TableCell>{format(new Date(booking.createdAt), 'MMM d, p')}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-block',
                            px: 1,
                            py: 0.25,
                            borderRadius: 0.5,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            bgcolor: booking.status === 'CONFIRMED' ? 'success.lighter' : 'action.hover',
                            color: booking.status === 'CONFIRMED' ? 'success.main' : 'text.secondary',
                          }}
                        >
                          {booking.status}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Modal>
  )
}

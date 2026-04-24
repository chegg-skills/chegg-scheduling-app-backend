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
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import { format } from 'date-fns'
import { ClipboardCheck, Users } from 'lucide-react'
import { Modal } from '@/components/shared/ui/Modal'
import { Spinner } from '@/components/shared/ui/Spinner'
import { useSlotBookings, useSlotSessionLog } from '@/hooks/queries/useEvents'
import type { EventScheduleSlot, Booking } from '@/types'

interface SlotAttendeesDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  slot: EventScheduleSlot | null
}

const STATUS_STYLES: Record<string, { bgcolor: string; color: string; label: string }> = {
  CONFIRMED:  { bgcolor: '#ECFEFA', color: '#1DA275', label: 'Confirmed' },
  COMPLETED:  { bgcolor: '#ECF5FF', color: '#2E8AEE', label: 'Completed' },
  NO_SHOW:    { bgcolor: '#FFFBE9', color: '#AC8B14', label: 'No Show' },
  CANCELLED:  { bgcolor: '#FFEAEB', color: '#E5222F', label: 'Cancelled' },
}

export function SlotAttendeesDialog({ isOpen, onClose, eventId, slot }: SlotAttendeesDialogProps) {
  const slotId = slot?.id || ''
  const { data: bookings, isLoading: bookingsLoading } = useSlotBookings(eventId, slotId)
  const { data: sessionLog, isLoading: logLoading } = useSlotSessionLog(eventId, slotId)

  const dateStr = slot ? format(new Date(slot.startTime), 'EEE, MMM d, yyyy') : ''
  const timeStr = slot
    ? `${format(new Date(slot.startTime), 'h:mm a')} - ${format(new Date(slot.endTime), 'h:mm a')}`
    : ''

  const isLoading = bookingsLoading || logLoading

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Session Attendees" size="md">
      <Box sx={{ mt: 1 }}>
        {/* Session header */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" color="text.secondary">Session Details</Typography>
          <Typography variant="body1" fontWeight={600}>{dateStr}</Typography>
          <Typography variant="body2" color="text.secondary">{timeStr}</Typography>
        </Box>

        {isLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><Spinner /></Box>
        ) : (
          <>
            {/* Attendees table */}
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <Users size={16} />
              <Typography variant="subtitle2" fontWeight={700}>Bookings</Typography>
            </Stack>

            {!bookings || (bookings as Booking[]).length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2, mb: 3 }}>
                <Typography color="text.secondary">No students have booked this session yet.</Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
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
                    {(bookings as Booking[]).map((booking) => {
                      const displayName = booking.studentName || 'Anonymous Student'
                      const displayEmail = booking.studentEmail || 'N/A'
                      const style = STATUS_STYLES[booking.status] ?? { bgcolor: 'action.hover', color: 'text.secondary', label: booking.status }
                      return (
                        <TableRow key={booking.id}>
                          <TableCell sx={{ fontWeight: 500 }}>{displayName}</TableCell>
                          <TableCell>{displayEmail}</TableCell>
                          <TableCell>{format(new Date(booking.createdAt), 'MMM d, p')}</TableCell>
                          <TableCell>
                            <Chip
                              label={style.label}
                              size="small"
                              sx={{ bgcolor: style.bgcolor, color: style.color, fontWeight: 600, border: 'none' }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Session Log section */}
            <Divider sx={{ mb: 2.5 }} />
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
              <ClipboardCheck size={16} />
              <Typography variant="subtitle2" fontWeight={700}>Session Log</Typography>
            </Stack>

            {!sessionLog ? (
              <Box sx={{ py: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  No session log recorded yet. Use "Log Session" from the slot actions to add one.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {/* Logged by + date */}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Logged by{' '}
                    <strong>
                      {sessionLog.loggedBy
                        ? `${sessionLog.loggedBy.firstName} ${sessionLog.loggedBy.lastName}`.trim()
                        : 'Unknown'}
                    </strong>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(sessionLog.updatedAt), 'MMM d, yyyy · h:mm a')}
                  </Typography>
                </Stack>

                {/* Attendance summary */}
                {sessionLog.attendance.length > 0 && (
                  <Box sx={{ p: 1.5, bgcolor: '#FFF6F0', border: '1px solid #DEE3ED', borderRadius: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Attendance
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {sessionLog.attendance.map((a) => {
                        const name = a.booking?.studentName || 'Student'
                        return (
                          <Chip
                            key={a.bookingId}
                            label={name}
                            size="small"
                            sx={{
                              bgcolor: a.attended ? '#ECFEFA' : '#FFEAEB',
                              color: a.attended ? '#1DA275' : '#E5222F',
                              fontWeight: 600,
                              border: 'none',
                            }}
                          />
                        )
                      })}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      {sessionLog.attendance.filter((a) => a.attended).length} attended ·{' '}
                      {sessionLog.attendance.filter((a) => !a.attended).length} absent
                    </Typography>
                  </Box>
                )}

                {/* Topics */}
                {sessionLog.topicsDiscussed && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                      Topics Discussed
                    </Typography>
                    <Typography variant="body2">{sessionLog.topicsDiscussed}</Typography>
                  </Box>
                )}

                {/* Summary */}
                {sessionLog.summary && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                      Session Summary
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{sessionLog.summary}</Typography>
                  </Box>
                )}

                {/* Coach notes — shown as a distinct private box */}
                {sessionLog.coachNotes && (
                  <Box sx={{ p: 1.5, bgcolor: '#FFFBE9', border: '1px solid #DEE3ED', borderRadius: 1.5 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
                      Coach Notes (Private)
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{sessionLog.coachNotes}</Typography>
                  </Box>
                )}
              </Stack>
            )}
          </>
        )}
      </Box>
    </Modal>
  )
}

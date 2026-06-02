import { Box, Typography, Divider, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { FileText, AlertTriangle, ClipboardCheck, Lock } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingDetailsLeftSection } from './BookingDetailsLeftSection'
import { BookingDetailsRightSection } from './BookingDetailsRightSection'
import { useBookingSessionLog } from '@/hooks/queries/useBookingLog'
import { usePermissions } from '@/hooks/usePermissions'
import { toTitleCase } from '@/utils/toTitleCase'

interface BookingDetailsPanelProps {
  booking: Booking
}

export const getBookingMeetingJoinUrl = (booking: Booking): string | null => {
  const fallbackLocation = booking.event?.locationValue ?? ''

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
  const { isCoach, isAdmin } = usePermissions()
  const canSeePrivateNotes = isCoach || isAdmin

  // Fetch the log on demand. Server returns either the booking's own log
  // (1:1) or the slot-level log (group bookings) so callers don't have to
  // distinguish.
  const { data: fetchedLog } = useBookingSessionLog(booking.id)
  const log = fetchedLog ?? booking.sessionLog ?? booking.scheduleSlot?.sessionLog ?? null

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

      {log && (
        <>
          <Divider sx={{ my: 4 }} />
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{
              fontWeight: 700,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              color: theme.palette.primary.main,
            }}
          >
            <ClipboardCheck size={16} /> Session log
          </Typography>
          <Box
            sx={{
              p: 2.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: 'action.hover',
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Logged by{' '}
                  <strong>
                    {log.loggedBy
                      ? `${toTitleCase(log.loggedBy.firstName)} ${toTitleCase(log.loggedBy.lastName)}`.trim()
                      : 'Unknown'}
                  </strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(log.updatedAt))}
                </Typography>
              </Stack>

              {log.topicsDiscussed && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Topics discussed
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {log.topicsDiscussed}
                  </Typography>
                </Box>
              )}

              {log.summary && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Session summary
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}
                  >
                    {log.summary}
                  </Typography>
                </Box>
              )}

              {log.coachNotes && canSeePrivateNotes && (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: '#FFFBE9',
                    border: '1px solid',
                    borderColor: 'warning.light',
                    borderRadius: 1.5,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                    <Lock size={13} />
                    <Typography variant="caption" color="warning.dark" fontWeight={700}>
                      Coach notes (private)
                    </Typography>
                  </Stack>
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: 'pre-wrap', color: 'warning.dark' }}
                  >
                    {log.coachNotes}
                  </Typography>
                </Box>
              )}

              {booking.scheduleSlotId && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  This is a group session log. To edit, open the schedule view of the event.
                </Typography>
              )}
            </Stack>
          </Box>
        </>
      )}
    </>
  )
}

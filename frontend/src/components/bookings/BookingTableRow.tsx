import { Box, Button, Collapse, Divider, TableCell, TableRow, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ChevronDown, ChevronUp, Clock, XCircle } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { BookingStatusBadge } from './BookingStatusBadge'
import { BookingDetailsPanel } from './BookingDetailsPanel'
import { BookingStudentCell } from './cells/BookingStudentCell'
import { BookingTimeCell } from './cells/BookingTimeCell'
import { BookingHostInfo } from './cells/BookingHostInfo'

interface BookingTableRowProps {
  booking: Booking
  onUpdateStatus: (id: string, status: BookingStatus) => void
  isExpanded: boolean
  onToggle: () => void
  onViewHost?: (userId: string) => void
}

export function BookingTableRow({
  booking,
  onUpdateStatus,
  isExpanded,
  onToggle,
  onViewHost,
}: BookingTableRowProps) {
  const theme = useTheme()
  const { handleAction } = useAsyncAction()

  const startTime = new Date(booking.startTime)
  const now = new Date()
  const tenMinutesAfterStart = new Date(startTime.getTime() + 10 * 60 * 1000)
  const canMarkNoShow = booking.status === 'CONFIRMED' && now >= tenMinutesAfterStart

  const handleStatusUpdate = async (status: BookingStatus, label: string) => {
    handleAction(
      ({ id, status: nextStatus }: { id: string; status: BookingStatus }) =>
        onUpdateStatus(id, nextStatus),
      { id: booking.id, status },
      {
        title: `${label} Booking`,
        message: `Are you sure you want to ${label.toLowerCase()} the booking for ${booking.studentName
          }?`,
        actionName: label,
      }
    )
  }

  return (
    <>
      <TableRow
        hover
        sx={{
          bgcolor: isExpanded ? alpha(theme.palette.secondary.main, 0.03) : 'inherit',
          transition: 'background-color 0.2s ease',
        }}
      >
        <TableCell sx={{ pl: 3 }}>
          <BookingStudentCell name={booking.studentName} email={booking.studentEmail} />
        </TableCell>

        <TableCell>
          <Box sx={{ color: 'text.secondary', typography: 'body2' }}>
            {booking.event?.name || 'Unknown Event'}
          </Box>
        </TableCell>

        <TableCell>
          <BookingHostInfo host={booking.host} onViewHost={onViewHost} />
        </TableCell>

        <TableCell>
          <BookingTimeCell startTime={booking.startTime} />
        </TableCell>

        <TableCell>
          <BookingStatusBadge status={booking.status} />
        </TableCell>

        <TableCell align="right" width={110}>
          <Button
            size="small"
            onClick={onToggle}
            endIcon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            sx={{
              color: isExpanded ? 'primary.main' : 'text.secondary',
              fontWeight: 600,
            }}
          >
            Details
          </Button>
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box
              sx={{
                py: 3,
                px: 3,
                bgcolor: alpha(theme.palette.secondary.main, 0.02),
                borderTop: '1px solid',
                borderColor: theme.palette.divider,
              }}
            >
              <BookingDetailsPanel booking={booking} onViewHost={onViewHost} />

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Box sx={{ mr: 'auto', alignSelf: 'center', color: 'text.secondary', typography: 'caption' }}>
                  Booking ID: {booking.id.slice(0, 8).toUpperCase()}
                </Box>

                {booking.status === 'CONFIRMED' && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<XCircle size={16} />}
                    onClick={() => handleStatusUpdate('CANCELLED', 'Cancel')}
                    sx={{ fontWeight: 600, borderRadius: 1.5 }}
                  >
                    Cancel Booking
                  </Button>
                )}

                {canMarkNoShow && (
                  <Button
                    variant="contained"
                    color="warning"
                    size="small"
                    startIcon={<Clock size={16} />}
                    onClick={() => handleStatusUpdate('NO_SHOW', 'No Show')}
                    sx={{ fontWeight: 600, borderRadius: 1.5 }}
                  >
                    Mark as No Show
                  </Button>
                )}
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

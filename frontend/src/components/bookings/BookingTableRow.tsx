import { Box, Button, Collapse, Divider, TableCell, TableRow } from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { ChevronDown, ChevronUp, Clock, XCircle, Calendar } from 'lucide-react'
import type { Booking } from '@/types'
import { useBookingStatusUpdate } from '@/hooks/useBookingStatusUpdate'
import { BookingStatusBadge } from './BookingStatusBadge'
import { BookingDetailsPanel } from './BookingDetailsPanel'
import { BookingStudentCell } from './cells/BookingStudentCell'
import { BookingTimeCell } from './cells/BookingTimeCell'
import { BookingCoachInfo } from './cells/BookingCoachInfo'

interface BookingTableRowProps {
  booking: Booking
  isExpanded: boolean
  onToggle: () => void
}

export function BookingTableRow({ booking, isExpanded, onToggle }: BookingTableRowProps) {
  const { handleStatusUpdate, canMarkNoShow } = useBookingStatusUpdate()

  return (
    <>
      <TableRow
        hover
        sx={{
          bgcolor: isExpanded ? 'action.hover' : 'inherit',
          transition: 'background-color 0.2s ease',
        }}
      >
        <TableCell sx={{ pl: 3 }}>
          <BookingStudentCell
            name={toTitleCase(booking.studentName)}
            email={booking.studentEmail}
          />
        </TableCell>

        <TableCell>
          <Box sx={{ color: 'text.secondary', typography: 'body2' }}>
            {booking.event?.name || 'Unknown Event'}
          </Box>
        </TableCell>

        <TableCell>
          <BookingCoachInfo coach={booking.coach ?? null} />
        </TableCell>

        <TableCell>
          <BookingTimeCell startTime={booking.startTime} endTime={booking.endTime} />
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
                bgcolor: 'grey.50',
                borderTop: '1px solid',
                borderBottom: '1px solid',
                borderColor: 'divider',
                borderLeft: '4px solid',
                borderLeftColor: 'primary.main',
              }}
            >
              <BookingDetailsPanel booking={booking} />

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
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
                  <Box sx={{ fontWeight: 600 }}>
                    Booking ID: {booking.id.slice(0, 8).toUpperCase()}
                  </Box>
                  <Box>
                    Created on{' '}
                    {new Intl.DateTimeFormat('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(booking.createdAt))}{' '}
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
              </Box>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

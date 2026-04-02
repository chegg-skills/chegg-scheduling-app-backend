import { Avatar, Box, Button, Collapse, Divider, Stack, TableCell, TableRow, Typography, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { ChevronDown, ChevronUp, Clock, XCircle } from 'lucide-react'
import type { Booking, BookingStatus } from '@/types'
import { useConfirm } from '@/context/ConfirmContext'
import { BookingStatusBadge } from './BookingStatusBadge'
import { BookingDetailsPanel } from './BookingDetailsPanel'

interface BookingTableRowProps {
  booking: Booking
  onUpdateStatus: (id: string, status: BookingStatus) => void
  isExpanded: boolean
  onToggle: () => void
}

export function BookingTableRow({
  booking,
  onUpdateStatus,
  isExpanded,
  onToggle,
}: BookingTableRowProps) {
  const theme = useTheme()
  const { confirm } = useConfirm()

  const startTime = new Date(booking.startTime)
  const now = new Date()
  const tenMinutesAfterStart = new Date(startTime.getTime() + 10 * 60 * 1000)
  const canMarkNoShow = booking.status === 'CONFIRMED' && now >= tenMinutesAfterStart

  const handleAction = async (status: BookingStatus, label: string) => {
    const isConfirmed = await confirm({
      title: `${label} Booking`,
      message: `Are you sure you want to ${label.toLowerCase()} the booking for ${booking.studentName}?`,
      confirmText: 'Confirm',
      cancelText: 'Back',
    })

    if (isConfirmed) {
      onUpdateStatus(booking.id, status)
    }
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
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: '0.8125rem',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
                fontWeight: 700,
              }}
            >
              {booking.studentName.split(' ').map((name) => name[0]).join('').toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {booking.studentName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {booking.studentEmail}
              </Typography>
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {booking.event?.name || 'Unknown Event'}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : 'N/A'}
          </Typography>
        </TableCell>

        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(startTime)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(startTime)}
          </Typography>
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
              <BookingDetailsPanel booking={booking} />

              <Divider sx={{ my: 3 }} />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', alignSelf: 'center' }}>
                  Booking ID: {booking.id.slice(0, 8).toUpperCase()}
                </Typography>

                {booking.status === 'CONFIRMED' && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    startIcon={<XCircle size={16} />}
                    onClick={() => handleAction('CANCELLED', 'Cancel')}
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
                    onClick={() => handleAction('NO_SHOW', 'Mark as No Show')}
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

import { useState } from 'react'
import {
  Box,
  Button,
  Collapse,
  TableCell,
  TableRow,
  Stack,
  Typography,
} from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { ChevronDown, ChevronUp, CalendarPlus, Calendar } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingStatusBadge } from './BookingStatusBadge'
import { BookingStudentCell } from './cells/BookingStudentCell'
import { BookingTimeCell } from './cells/BookingTimeCell'
import { BookingCoachInfo } from './cells/BookingCoachInfo'
import { useAuth } from '@/context/auth/useAuth'
import { BookFollowUpDialog } from './BookFollowUpDialog'
import { BookingDetailsExpandedContent } from './BookingDetailsExpandedContent'
import { hexToIconColors } from '@/utils/color'

interface BookingTableRowProps {
  booking: Booking
  isExpanded: boolean
  onToggle: () => void
}

export function BookingTableRow({ booking, isExpanded, onToggle }: BookingTableRowProps) {
  const { user } = useAuth()
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const iconColors = hexToIconColors(booking.event?.eventType?.color ?? '#6366f1')


  return (
    <>
      <TableRow
        hover
        onClick={onToggle}
        sx={{
          bgcolor: isExpanded ? 'action.hover' : 'inherit',
          transition: 'background-color 0.2s ease',
          cursor: 'pointer',
          '& .MuiTableCell-root': { py: 2 },
        }}
      >
        <TableCell>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: iconColors.bg,
                color: iconColors.icon,
                flexShrink: 0,
              }}
            >
              <Calendar size={18} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {booking.event?.name || 'Unknown Event'}
              </Typography>
              {booking.event?.eventType?.name && (
                <Typography variant="caption" color="text.secondary">
                  {booking.event.eventType.name}
                </Typography>
              )}
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <BookingStudentCell
            name={toTitleCase(booking.studentName)}
            email={booking.studentEmail}
            studentId={booking.studentId}
          />
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

        <TableCell align="right" sx={{ pr: 3, width: 140 }}>
          <Stack direction="row" spacing={0.75} justifyContent="flex-end" alignItems="center">
            {booking.status === 'COMPLETED' &&
              user &&
              ['SUPER_ADMIN', 'TEAM_ADMIN', 'COACH'].includes(user.role) && (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    alignSelf: 'center',
                    cursor: 'pointer',
                    color: 'text.secondary',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1.5,
                    height: 28,
                    px: 0.75,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'primary.lighter',
                      borderColor: 'primary.main',
                      transform: 'scale(1.03)',
                    },
                    '&:active': {
                      transform: 'scale(0.97)',
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsFollowUpOpen(true)
                  }}
                >
                  <CalendarPlus size={14} style={{ flexShrink: 0 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      color: 'inherit',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Follow-Up
                  </Typography>
                </Box>
              )}
            <Button
              size="small"
              onClick={(e) => { e.stopPropagation(); onToggle() }}
              endIcon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              sx={{
                color: isExpanded ? 'primary.main' : 'text.secondary',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                px: 0.75,
                minWidth: 'auto',
              }}
            >
              {isExpanded ? 'Hide' : 'Details'}
            </Button>
          </Stack>
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
              <BookingDetailsExpandedContent booking={booking} onFollowUpOpen={() => setIsFollowUpOpen(true)} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
      <BookFollowUpDialog
        isOpen={isFollowUpOpen}
        booking={booking}
        onClose={() => setIsFollowUpOpen(false)}
      />
    </>
  )
}

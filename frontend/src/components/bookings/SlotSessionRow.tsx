import { Collapse, TableCell, TableRow, Box, Stack, Typography, Chip, Button } from '@mui/material'
import { ChevronDown, ChevronUp, Users } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingStatusBadge } from './BookingStatusBadge'
import { BookingTimeCell } from './cells/BookingTimeCell'
import { BookingCoachInfo } from './cells/BookingCoachInfo'
import { SlotSessionPanel } from './SlotSessionPanel'
import { deriveSlotStatus } from './slotUtils'

interface SlotSessionRowProps {
  slotId: string
  bookings: Booking[]
  isExpanded: boolean
  onToggle: () => void
}

export function SlotSessionRow({
  bookings,
  isExpanded,
  onToggle,
}: SlotSessionRowProps) {
  const first = bookings[0]
  if (!first) return null

  const activeCount = bookings.filter((b) => b.status !== 'CANCELLED').length
  const slotStatus = deriveSlotStatus(bookings)
  const capacity = first.scheduleSlot?.capacity ?? first.event?.maxParticipantCount ?? null

  return (
    <>
      <TableRow
        hover
        sx={{
          bgcolor: isExpanded ? 'action.hover' : 'inherit',
          transition: 'background-color 0.2s ease',
          cursor: 'pointer',
        }}
        onClick={onToggle}
      >
        {/* Session label — spans Student + Event columns */}
        <TableCell sx={{ pl: 3 }} colSpan={2}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 1,
                bgcolor: 'primary.lighter',
                color: 'primary.main',
                flexShrink: 0,
              }}
            >
              <Users size={16} />
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {first.event?.name ?? 'Group Session'}
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }}>
                <Chip
                  label={`${activeCount}${capacity ? ` / ${capacity}` : ''} enrolled`}
                  size="small"
                  sx={{ fontSize: '0.7rem', height: 18, bgcolor: 'action.hover' }}
                />
              </Stack>
            </Box>
          </Stack>
        </TableCell>

        <TableCell>
          <BookingCoachInfo coach={first.coach ?? null} />
        </TableCell>

        <TableCell>
          <BookingTimeCell startTime={first.startTime} endTime={first.endTime} />
        </TableCell>

        <TableCell>
          <BookingStatusBadge status={slotStatus} />
        </TableCell>

        <TableCell align="right" sx={{ pr: 3 }}>
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            endIcon={isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            sx={{
              color: isExpanded ? 'primary.main' : 'text.secondary',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {isExpanded ? 'Hide' : 'Details'}
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
              <SlotSessionPanel bookings={bookings} />
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}

import { Collapse, TableCell, TableRow, Box, Stack, Typography, Button } from '@mui/material'
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingStatusBadge } from './BookingStatusBadge'
import { BookingTimeCell } from './cells/BookingTimeCell'
import { BookingCoachInfo } from './cells/BookingCoachInfo'
import { SlotSessionPanel } from './SlotSessionPanel'
import { deriveSlotStatus } from './slotUtils'
import { hexToIconColors } from '@/utils/color'

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
  const iconColors = hexToIconColors(first.event?.eventType?.color ?? '#6366f1')

  return (
    <>
      <TableRow
        hover
        sx={{
          bgcolor: isExpanded ? 'action.hover' : 'inherit',
          transition: 'background-color 0.2s ease',
          cursor: 'pointer',
          '& .MuiTableCell-root': { py: 2 },
        }}
        onClick={onToggle}
      >
        {/* Event name cell — Column 1 */}
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
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {first.event?.name || 'Group Session'}
              </Typography>
              {first.event?.eventType?.name && (
                <Typography variant="caption" color="text.secondary">
                  {first.event.eventType.name}
                </Typography>
              )}
            </Box>
          </Stack>
        </TableCell>

        {/* Group Session placeholder — Column 2 */}
        <TableCell>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Group Session
            </Typography>
            <Box
              component="span"
              sx={{
                display: 'inline-block',
                mt: 0.5,
                px: 0.75,
                py: 0.15,
                fontSize: '0.7rem',
                fontWeight: 700,
                borderRadius: 0.75,
                bgcolor: 'action.selected',
                color: 'text.secondary',
                letterSpacing: '0.02em',
              }}
            >
              {activeCount}{capacity ? ` / ${capacity}` : ''} enrolled
            </Box>
          </Box>
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

        <TableCell align="right" sx={{ pr: 3, width: 140 }}>
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
              px: 0.75,
              minWidth: 'auto',
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

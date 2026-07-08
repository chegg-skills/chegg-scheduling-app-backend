import { useState } from 'react'
import { Link } from 'react-router-dom'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { TrackerSlot } from '@/api/tracker'
import { LogSessionDialog } from '@/components/events/dialogs/LogSessionDialog'
import { EmptyState } from '@/components/shared/ui/EmptyState'
import type { EventScheduleSlot } from '@/types'
import { OccupancyBadge } from './OccupancyBadge'
import { ordinal } from '@/utils/ordinal'

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })

function toEventScheduleSlot(slot: TrackerSlot): EventScheduleSlot {
  return {
    id: slot.slotId,
    eventId: slot.event.id,
    startTime: slot.startTime,
    endTime: slot.endTime,
    capacity: slot.capacity,
    isActive: true,
    isCancelled: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    assignedCoachId: slot.assignedCoach?.id ?? null,
    recurrenceGroupId: null,
    coachRevealSentAt: null,
    sessionJoinUrl: null,
  }
}

interface TrackerTableProps {
  slots: TrackerSlot[]
  isLoading: boolean
}

export function TrackerTable({ slots, isLoading }: TrackerTableProps) {
  const [selectedSlot, setSelectedSlot] = useState<TrackerSlot | null>(null)
  const [readOnlyDialog, setReadOnlyDialog] = useState(false)

  const openDialog = (slot: TrackerSlot, readOnly: boolean) => {
    setReadOnlyDialog(readOnly)
    setSelectedSlot(slot)
  }

  if (isLoading) {
    return (
      <Stack alignItems="center" py={8}>
        <CircularProgress />
      </Stack>
    )
  }

  if (slots.length === 0) {
    return (
      <EmptyState
        title="No sessions found"
        description="There are no scheduled sessions matching the selected filters."
      />
    )
  }

  const now = new Date()

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Team</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Coach</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Occupancy
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Log
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {slots.map((slot) => (
              <TableRow key={slot.slotId} hover>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {dateFormatter.format(new Date(slot.startTime))}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {timeFormatter.format(new Date(slot.startTime))}
                    {' – '}
                    {timeFormatter.format(new Date(slot.endTime))}
                  </Typography>
                  {slot.seriesSessionNumber !== null && (
                    <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }} noWrap display="block">
                      {ordinal(slot.seriesSessionNumber)} session
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                    {slot.team.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography
                      variant="body2"
                      component={Link}
                      to={`/events/${slot.event.id}?tab=bookings`}
                      sx={{ textTransform: 'capitalize', color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {slot.event.name}
                    </Typography>
                    {slot.eventType && (
                      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }} display="block">
                        {slot.eventType.name}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {slot.assignedCoach ? (
                    <Typography variant="body2">
                      {slot.assignedCoach.firstName} {slot.assignedCoach.lastName}
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <OccupancyBadge
                    bookingCount={slot.bookingCount}
                    capacity={slot.capacity}
                    status={slot.status}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={slot.status === 'FULL' ? 'Full' : slot.status === 'CLOSED' ? 'Closed' : 'Open'}
                    size="small"
                    color={slot.status === 'FULL' ? 'error' : slot.status === 'CLOSED' ? 'default' : 'info'}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={slot.isLogged ? 'Logged' : 'Not logged'}
                    size="small"
                    color={slot.isLogged ? 'success' : 'default'}
                    variant={slot.isLogged ? 'filled' : 'outlined'}
                    sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                    <Button
                      size="small"
                      variant="text"
                      disabled={new Date(slot.startTime) > now}
                      onClick={() => openDialog(slot, slot.isLogged)}
                      sx={{ fontSize: '0.72rem', py: 0.25, px: 1 }}
                    >
                      {slot.isLogged ? 'View Log' : 'Log Session'}
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <LogSessionDialog
        isOpen={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
        eventId={selectedSlot?.event.id ?? ''}
        slot={selectedSlot ? toEventScheduleSlot(selectedSlot) : null}
        readOnly={readOnlyDialog}
      />
    </>
  )
}

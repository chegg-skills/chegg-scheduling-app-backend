import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { TablePagination } from '@/components/shared/table/TablePagination'
import { ScheduleSlotRow } from './ScheduleSlotRow'
import { RevealCoachDialog } from './dialogs/RevealCoachDialog'
import type { EventScheduleSlot, Event } from '@/types'
import { usePermissions } from '@/hooks/usePermissions'

interface ScheduleSlotListProps {
  slots: EventScheduleSlot[]
  groupSlots?: EventScheduleSlot[]
  event: Event
  onRemove: (slotId: string, info: string) => void
  onEdit: (slot: EventScheduleSlot) => void
  onViewAttendees: (slot: EventScheduleSlot) => void
  onLogSession: (slot: EventScheduleSlot) => void
  onCancel: (slot: EventScheduleSlot, info: string) => void
  canManage?: boolean
}

export function ScheduleSlotList({
  slots,
  groupSlots,
  event,
  onRemove,
  onEdit,
  onViewAttendees,
  onLogSession,
  onCancel,
  canManage = true,
}: ScheduleSlotListProps) {
  const { isCoach } = usePermissions()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [revealSlot, setRevealSlot] = useState<EventScheduleSlot | null>(null)

  const unreveledUpcoming = event.deferCoachReveal
    ? slots.filter(
        (s) =>
          !s.coachRevealSentAt &&
          !s.isCancelled &&
          new Date(s.startTime) > new Date() &&
          new Date(s.startTime) < new Date(Date.now() + 3 * 60 * 60 * 1000)
      )
    : []

  if (slots.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 4,
          textAlign: 'center',
          borderStyle: 'dashed',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ color: 'text.secondary' }}>No sessions scheduled yet for this event.</Box>
      </Paper>
    )
  }

  const paginatedSlots = slots.slice((page - 1) * pageSize, page * pageSize)

  const chronSorted = [...(groupSlots ?? slots)].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <>
      {(canManage || isCoach) && unreveledUpcoming.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {unreveledUpcoming.length} upcoming session
          {unreveledUpcoming.length > 1 ? 's' : ''} within the next 3 hours{' '}
          {unreveledUpcoming.length > 1 ? 'have' : 'has'} not had the coach reveal sent.
        </Alert>
      )}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{ borderRadius: 2, overflow: 'hidden' }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Time Range</TableCell>
              <TableCell>Occupancy</TableCell>
              <TableCell>Assigned Coach</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Logged</TableCell>
              <TableCell align="right" sx={{ pr: 3 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSlots.map((slot) => {
              const slotNumber = chronSorted.findIndex((s) => s.id === slot.id) + 1

              return (
                <ScheduleSlotRow
                  key={slot.id}
                  slot={slot}
                  event={event}
                  slotNumber={slotNumber}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  onViewAttendees={onViewAttendees}
                  onLogSession={onLogSession}
                  onCancel={onCancel}
                  onReveal={setRevealSlot}
                  canManage={canManage}
                />
              )
            })}
          </TableBody>
        </Table>
        <TablePagination
          pagination={{
            page,
            pageSize,
            total: slots.length,
            totalPages: Math.ceil(slots.length / pageSize),
          }}
          onPageChange={setPage}
          onRowsPerPageChange={(newSize) => {
            setPageSize(newSize)
            setPage(1)
          }}
        />
      </TableContainer>

      <RevealCoachDialog
        key={revealSlot?.id ?? 'reveal-coach-dialog'}
        isOpen={!!revealSlot}
        onClose={() => setRevealSlot(null)}
        event={event}
        slot={revealSlot}
      />
    </>
  )
}

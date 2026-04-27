import { useState } from 'react'
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
import type { EventScheduleSlot, Event } from '@/types'

interface ScheduleSlotListProps {
  slots: EventScheduleSlot[]
  event: Event
  onRemove: (slotId: string, info: string) => void
  onEdit: (slot: EventScheduleSlot) => void
  onViewAttendees: (slot: EventScheduleSlot) => void
  onLogSession: (slot: EventScheduleSlot) => void
  onCancel: (slot: EventScheduleSlot, info: string) => void
}

export function ScheduleSlotList({
  slots,
  event,
  onRemove,
  onEdit,
  onViewAttendees,
  onLogSession,
  onCancel,
}: ScheduleSlotListProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  return (
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
          {paginatedSlots.map((slot) => (
            <ScheduleSlotRow
              key={slot.id}
              slot={slot}
              event={event}
              onRemove={onRemove}
              onEdit={onEdit}
              onViewAttendees={onViewAttendees}
              onLogSession={onLogSession}
              onCancel={onCancel}
            />
          ))}
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
  )
}

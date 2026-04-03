import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { Event } from '@/types'
import { Modal } from '@/components/shared/Modal'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useConfirm } from '@/context/ConfirmContext'
import { useTableSort } from '@/hooks/useTableSort'
import { EventForm } from './EventForm'
import { EventTableRow } from './EventTableRow'
import { eventSortAccessors, eventTableColumns } from './eventTableUtils'

interface EventTableProps {
  events: Event[]
  teamId?: string
}

export function EventTable({ events, teamId }: EventTableProps) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { mutate: deleteEvent } = useDeleteEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { confirm } = useConfirm()
  const { sortedItems: sortedEvents, sortConfig, requestSort } = useTableSort(events, eventSortAccessors)

  async function handleToggleActive(event: Event) {
    const newStatus = !event.isActive

    const confirmed = await confirm({
      title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
      message: newStatus
        ? `Are you sure you want to mark event "${event.name}" as active? This will make it visible on the public booking page.`
        : `Are you sure you want to mark event "${event.name}" as inactive? This will hide it from the public booking page but keep all its configuration.`,
    })

    if (confirmed) {
      updateEvent({ eventId: event.id, data: { isActive: newStatus } })
    }
  }

  async function handleDelete(event: Event) {
    const confirmed = await confirm({
      title: 'Delete Event',
      message: `Are you sure you want to PERMANENTLY delete event "${event.name}"?\n\nThis action cannot be undone and all associated host assignments will be lost.`,
    })

    if (confirmed) {
      deleteEvent(event.id)
    }
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {eventTableColumns.map((column) => (
                <SortableHeaderCell
                  key={column.sortKey}
                  label={column.label}
                  sortKey={column.sortKey}
                  activeSortKey={sortConfig?.key ?? null}
                  direction={sortConfig?.direction ?? 'asc'}
                  onSort={requestSort}
                  tooltip={column.tooltip}
                />
              ))}
              <TableCell
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    No events found in this team.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedEvents.map((event) => (
                <EventTableRow
                  key={event.id}
                  event={event}
                  onEdit={setEditingEvent}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editingEvent && (
        <Modal
          isOpen
          size="lg"
          onClose={() => setEditingEvent(null)}
          title={`Edit "${editingEvent.name}"`}
        >
          <EventForm
            teamId={teamId ?? ''}
            event={editingEvent}
            onSuccess={() => setEditingEvent(null)}
            onCancel={() => setEditingEvent(null)}
          />
        </Modal>
      )}
    </>
  )
}

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
import { useDeleteEvent, useDuplicateEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useTableSort } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { EventForm } from './EventForm'
import { EventTableRow } from './EventTableRow'
import { eventSortAccessors, eventTableColumns } from './eventTableUtils'

interface EventTableProps {
  events: Event[]
  teamId?: string
  onViewUser?: (userId: string) => void
}

export function EventTable({ events, teamId, onViewUser }: EventTableProps) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { mutate: deleteEvent } = useDeleteEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: duplicateEvent } = useDuplicateEvent()
  const { handleAction } = useAsyncAction()
  const { sortedItems: sortedEvents, sortConfig, requestSort } = useTableSort(events, eventSortAccessors)

  async function handleToggleActive(event: Event) {
    const newStatus = !event.isActive

    handleAction(
      updateEvent,
      { eventId: event.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
        message: newStatus
          ? `Are you sure you want to mark event "${event.name}" as active? This will make it visible on the public booking page.`
          : `Are you sure you want to mark event "${event.name}" as inactive? This will hide it from the public booking page but keep all its configuration.`,
        actionName: 'Update',
      }
    )
  }

  async function handleDuplicate(event: Event) {
    handleAction(duplicateEvent, event.id, {
      title: 'Duplicate Event',
      message: `Are you sure you want to create a duplicate of "${event.name}"?\n\nThe new copy will be set to inactive so you can review its settings before publishing.`,
      actionName: 'Duplicate',
    })
  }

  async function handleDelete(event: Event) {
    handleAction(deleteEvent, event.id, {
      title: 'Delete Event',
      message: `Are you sure you want to PERMANENTLY delete event "${event.name}"?\n\nThis action cannot be undone and all associated host assignments will be lost.`,
      actionName: 'Delete',
    })
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
                  onDuplicate={handleDuplicate}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                  onViewUser={onViewUser}
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

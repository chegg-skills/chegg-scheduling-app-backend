import React, { useState, useMemo } from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import { alpha } from '@mui/material/styles'
import type { Event, EventGroup } from '@/types'
import { Modal } from '@/components/shared/ui/Modal'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { useDeleteEvent, useDuplicateEvent, useUpdateEvent } from '@/hooks/queries/useEvents'
import { useTableSort } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { EventForm } from '../form/EventForm'
import { EventTableRow } from './EventTableRow'
import { toTitleCase } from '@/utils/toTitleCase'
import { eventSortAccessors, eventTableColumns } from './eventTableUtils'

interface EventTableProps {
  events: Event[]
  teamId?: string
  onViewUser?: (userId: string) => void
  stuckToTop?: boolean
  groupByGroup?: boolean
  groups?: EventGroup[]
  canManage?: boolean
}

export function EventTable({
  events,
  teamId,
  onViewUser,
  stuckToTop = false,
  groupByGroup = false,
  groups = [],
  canManage = false,
}: EventTableProps) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { mutate: deleteEvent } = useDeleteEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: duplicateEvent } = useDuplicateEvent()
  const { handleAction } = useAsyncAction()
  const {
    sortedItems: sortedEvents,
    sortConfig,
    requestSort,
  } = useTableSort(events, eventSortAccessors)



  const groupedEvents = useMemo(() => {
    if (!groupByGroup) {
      return [{ id: 'all', name: 'All Events', color: null, events: sortedEvents }]
    }

    const groupMap = new Map<string, { id: string; name: string; color: string | null; events: Event[] }>()

    sortedEvents.forEach((event) => {
      const gId = event.groupId ?? 'ungrouped'
      const gName = event.group?.name ?? 'Ungrouped Events'
      const gColor = event.group?.color ?? null

      const existing = groupMap.get(gId) ?? { id: gId, name: gName, color: gColor, events: [] }
      existing.events.push(event)
      groupMap.set(gId, existing)
    })

    const result: { id: string; name: string; color: string | null; events: Event[] }[] = []
    
    if (groups && groups.length > 0) {
      groups.forEach((g) => {
        const match = groupMap.get(g.id)
        if (match) {
          result.push(match)
        }
      })
    }

    const ungroupedMatch = groupMap.get('ungrouped')
    if (ungroupedMatch) {
      result.push(ungroupedMatch)
    }

    if (result.length === 0 && groupMap.size > 0) {
      return Array.from(groupMap.values())
    }

    return result
  }, [sortedEvents, groupByGroup, groups])

  async function handleToggleActive(event: Event) {
    const newStatus = !event.isActive

    handleAction(
      updateEvent,
      { eventId: event.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Mark as active' : 'Mark as inactive',
        message: newStatus
          ? `Are you sure you want to mark event "${toTitleCase(event.name)}" as active? This will make it visible on the public booking page.`
          : `Are you sure you want to mark event "${toTitleCase(event.name)}" as inactive? This will hide it from the public booking page but keep all its configuration.`,
        actionName: 'Update',
      }
    )
  }

  async function handleDuplicate(event: Event) {
    handleAction(duplicateEvent, event.id, {
      title: 'Duplicate event',
      message: `Are you sure you want to create a duplicate of "${toTitleCase(event.name)}"?\n\nThe new copy will be set to inactive so you can review its settings before publishing.`,
      actionName: 'Duplicate',
    })
  }

  async function handleDelete(event: Event) {
    handleAction(deleteEvent, event.id, {
      title: 'Delete event',
      message: `Are you sure you want to PERMANENTLY delete event "${toTitleCase(event.name)}"?\n\nThis action cannot be undone and all associated host assignments will be lost.`,
      actionName: 'Delete',
    })
  }

  return (
    <>
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          ...(stuckToTop && {
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderTop: 'none',
          }),
        }}
      >
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
              {canManage && (
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
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {sortedEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 8 : 7} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    No events found in this team.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              groupedEvents.map((group) => (
                <React.Fragment key={group.id}>
                  {groupByGroup && (
                    <TableRow
                      sx={{
                        bgcolor: (theme) => alpha(group.color ?? theme.palette.primary.main, 0.04),
                      }}
                    >
                      <TableCell
                        colSpan={canManage ? 8 : 7}
                        sx={{
                          py: 1.5,
                          px: 3,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          {group.color && (
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: group.color,
                                boxShadow: `0 0 6px ${alpha(group.color, 0.4)}`,
                              }}
                            />
                          )}
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              color: 'text.secondary',
                              letterSpacing: '0.08em',
                              fontSize: '0.75rem',
                            }}
                          >
                            {group.name}
                          </Typography>
                          <Box
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              px: 1,
                              py: 0.25,
                              borderRadius: '10px',
                              backgroundColor: (theme) =>
                                alpha(group.color ?? theme.palette.primary.main, 0.1),
                              color: group.color ?? 'primary.main',
                            }}
                          >
                            {group.events.length} {group.events.length === 1 ? 'Event' : 'Events'}
                          </Box>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                  {group.events.map((event) => (
                    <EventTableRow
                      key={event.id}
                      event={event}
                      onEdit={setEditingEvent}
                      onDuplicate={handleDuplicate}
                      onToggleActive={handleToggleActive}
                      onDelete={handleDelete}
                      onViewUser={onViewUser}
                      canManage={canManage}
                    />
                  ))}
                </React.Fragment>
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
          title={`Edit "${toTitleCase(editingEvent.name)}"`}
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

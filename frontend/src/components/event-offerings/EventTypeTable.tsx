import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { Layers, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import type { EventType } from '@/types'
import { useDeleteEventType, useUpdateEventType } from '@/hooks/queries/useEventTypes'
import { Badge } from '@/components/shared/ui/Badge'
import { Modal } from '@/components/shared/ui/Modal'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { EventTypeForm } from './EventTypeForm'
import { RowActions } from '@/components/shared/table/RowActions'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { toTitleCase } from '@/utils/toTitleCase'

interface EventTypeTableProps {
  eventTypes: EventType[]
}

const headerTooltips: Record<string, string> = {
  'Event Type': 'A category or type of service provided (e.g., Tutorial).',
  Key: 'A unique identifier used for URL paths and internal references.',
  Sort: 'The display order of this event type in lists.',
}

type EventTypeSortKey = 'eventType' | 'key' | 'sort' | 'status'

const eventTypeSortAccessors: SortAccessorMap<EventType, EventTypeSortKey> = {
  eventType: (et) => et.name,
  key: (et) => et.key,
  sort: (et) => et.sortOrder,
  status: (et) => et.isActive,
}

export function EventTypeTable({ eventTypes }: EventTypeTableProps) {
  const [editing, setEditing] = useState<EventType | null>(null)
  const {
    sortedItems: sortedEventTypes,
    sortConfig,
    requestSort,
  } = useTableSort(eventTypes, eventTypeSortAccessors)
  const { mutate: deleteEventType } = useDeleteEventType()
  const { mutate: updateEventType } = useUpdateEventType()
  const { handleAction } = useAsyncAction()

  const handleToggleActive = (eventType: EventType) => {
    const newStatus = !eventType.isActive
    handleAction(
      updateEventType,
      { eventTypeId: eventType.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Mark as active' : 'Mark as inactive',
        message: newStatus
          ? `Are you sure you want to mark "${toTitleCase(eventType.name)}" as active? This will make it available for new events.`
          : `Are you sure you want to mark "${toTitleCase(eventType.name)}" as inactive? This will hide it from new selections but keep existing events linked.`,
        actionName: 'Update',
      }
    )
  }

  const handleDelete = (eventType: EventType) => {
    handleAction(deleteEventType, eventType.id, {
      title: 'Delete event type',
      message: `Are you sure you want to PERMANENTLY delete "${toTitleCase(eventType.name)}"?\n\nThis action will only succeed if no events are currently using this event type.`,
      actionName: 'Delete',
    })
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {[
                {
                  label: 'Event Type',
                  sortKey: 'eventType' as const,
                  tooltip: headerTooltips['Event Type'],
                },
                { label: 'Key', sortKey: 'key' as const, tooltip: headerTooltips.Key },
                { label: 'Sort', sortKey: 'sort' as const, tooltip: headerTooltips.Sort },
                { label: 'Status', sortKey: 'status' as const },
              ].map((col) => (
                <SortableHeaderCell
                  key={col.sortKey}
                  label={col.label}
                  sortKey={col.sortKey}
                  activeSortKey={sortConfig?.key ?? null}
                  direction={sortConfig?.direction ?? 'asc'}
                  onSort={requestSort}
                  tooltip={col.tooltip}
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
            {sortedEventTypes.map((et) => (
              <TableRow key={et.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        bgcolor: 'warning.light',
                        color: 'warning.dark',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Layers size={18} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {toTitleCase(et.name)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 0.5,
                    }}
                  >
                    {et.key}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: '0.875rem' }}>{et.sortOrder}</TableCell>
                <TableCell>
                  <Badge
                    label={et.isActive ? 'Active' : 'Inactive'}
                    color={et.isActive ? 'green' : 'red'}
                  />
                </TableCell>
                <TableCell>
                  <RowActions
                    actions={[
                      {
                        label: 'Edit',
                        icon: <Edit size={16} />,
                        onClick: () => setEditing(et),
                      },
                      {
                        label: et.isActive ? 'Mark as inactive' : 'Mark as active',
                        icon: et.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                        onClick: () => handleToggleActive(et),
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 size={16} />,
                        color: 'error.main',
                        onClick: () => handleDelete(et),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editing && (
        <Modal
          isOpen
          onClose={() => setEditing(null)}
          title={`Edit "${toTitleCase(editing.name)}"`}
        >
          <EventTypeForm eventType={editing} onSuccess={() => setEditing(null)} />
        </Modal>
      )}
    </>
  )
}

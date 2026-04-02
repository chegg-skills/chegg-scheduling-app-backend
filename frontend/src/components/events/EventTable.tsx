import { useState } from 'react'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { Link as RouterLink } from 'react-router-dom'
import { Calendar, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Tooltip from '@mui/material/Tooltip'
import { alpha, useTheme } from '@mui/material/styles'
import type { Event } from '@/types'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { EventForm } from './EventForm'
import { useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useConfirm } from '@/context/ConfirmContext'
import { RowActions } from '@/components/shared/RowActions'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'

interface EventTableProps {
  events: Event[]
  teamId?: string
}

function formatDuration(seconds: number) {
  const mins = Math.round(seconds / 60)
  return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`
}

const headerTooltips: Record<string, string> = {
  Offering: 'The category this event belongs to (e.g., Tutorial).',
  Strategy: 'How hosts are assigned (Direct or Round Robin).',
}

type EventSortKey = 'event' | 'offering' | 'duration' | 'hosts' | 'strategy' | 'status'

const eventSortAccessors: SortAccessorMap<Event, EventSortKey> = {
  event: (event) => event.name,
  offering: (event) => event.offering?.name ?? '',
  duration: (event) => event.durationSeconds,
  hosts: (event) => event.hosts.length,
  strategy: (event) => event.assignmentStrategy,
  status: (event) => event.isActive,
}

export function EventTable({ events, teamId }: EventTableProps) {
  const theme = useTheme()
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { mutate: deleteEvent } = useDeleteEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { confirm } = useConfirm()
  const { sortedItems: sortedEvents, sortConfig, requestSort } = useTableSort(events, eventSortAccessors)

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {[
                { label: 'Event', sortKey: 'event' as const },
                { label: 'Offering', sortKey: 'offering' as const, tooltip: headerTooltips.Offering },
                { label: 'Duration', sortKey: 'duration' as const },
                { label: 'Hosts', sortKey: 'hosts' as const },
                { label: 'Strategy', sortKey: 'strategy' as const, tooltip: headerTooltips.Strategy },
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
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    No events found in this team.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedEvents.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                        }}
                      >
                        <Calendar size={18} />
                      </Box>
                      <Link
                        component={RouterLink}
                        to={`/events/${event.id}`}
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          textDecoration: 'none',
                          '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                        }}
                      >
                        {event.name}
                      </Link>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    {event.offering?.name ?? '—'}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                    {formatDuration(event.durationSeconds)}
                  </TableCell>
                  <TableCell>
                    <AvatarGroup max={4} sx={{ justifyContent: 'flex-end', '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' } }}>
                      {event.hosts.map((host) => (
                        <Tooltip key={host.id} title={`${host.hostUser.firstName} ${host.hostUser.lastName} (${host.hostUser.email})`} arrow>
                          <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.dark' }}>
                            {host.hostUser.firstName[0]}
                            {host.hostUser.lastName[0]}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={event.assignmentStrategy === 'ROUND_ROBIN' ? 'Round Robin' : 'Direct'}
                      variant={event.assignmentStrategy === 'ROUND_ROBIN' ? 'blue' : 'gray'}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={event.isActive ? 'Active' : 'Inactive'}
                      variant={event.isActive ? 'green' : 'red'}
                    />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      actions={[
                        {
                          label: 'Edit event details',
                          icon: <Edit size={16} />,
                          onClick: () => setEditingEvent(event),
                        },
                        {
                          label: event.isActive ? 'Mark as Inactive' : 'Mark as Active',
                          icon: event.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                          onClick: async () => {
                            const newStatus = !event.isActive
                            if (
                              await confirm({
                                title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
                                message: newStatus
                                  ? `Are you sure you want to mark event "${event.name}" as active? This will make it visible on the public booking page.`
                                  : `Are you sure you want to mark event "${event.name}" as inactive? This will hide it from the public booking page but keep all its configuration.`,
                              })
                            ) {
                              updateEvent({ eventId: event.id, data: { isActive: newStatus } })
                            }
                          },
                        },
                        {
                          label: 'Delete event',
                          icon: <Trash2 size={16} />,
                          color: 'error.main',
                          onClick: async () => {
                            if (
                              await confirm({
                                title: 'Delete Event',
                                message: `Are you sure you want to PERMANENTLY delete event "${event.name}"?\n\nThis action cannot be undone and all associated host assignments will be lost.`,
                              })
                            ) {
                              deleteEvent(event.id)
                            }
                          },
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
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

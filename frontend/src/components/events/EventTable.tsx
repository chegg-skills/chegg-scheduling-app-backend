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
import { Calendar, Edit, Trash2 } from 'lucide-react'
import type { Event } from '@/types'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { EventForm } from './EventForm'
import { useDeactivateEvent } from '@/hooks/useEvents'
import { useConfirm } from '@/context/ConfirmContext'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { RowActions } from '@/components/shared/RowActions'

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

export function EventTable({ events, teamId }: EventTableProps) {
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const { mutate: deactivate } = useDeactivateEvent()
  const { confirm } = useConfirm()

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {['Event', 'Offering', 'Duration', 'Strategy', 'Status', 'Actions'].map(
                (col) => (
                  <TableCell
                    key={col}
                    sx={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                      letterSpacing: '0.05em',
                    }}
                  >
                    <Stack direction="row" alignItems="center">
                      {col}
                      {headerTooltips[col] && <InfoTooltip title={headerTooltips[col]} />}
                    </Stack>
                  </TableCell>
                ),
              )}
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
              events.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
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
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {formatDuration(event.durationSeconds)}
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
                          label: 'Edit',
                          icon: <Edit size={16} />,
                          onClick: () => setEditingEvent(event),
                        },
                        ...(event.isActive
                          ? [
                            {
                              label: 'Deactivate',
                              icon: <Trash2 size={16} />,
                              color: 'error.main',
                              onClick: async () => {
                                if (
                                  await confirm({
                                    title: 'Deactivate Event',
                                    message: `Are you sure you want to deactivate event "${event.name}"?`,
                                  })
                                ) {
                                  deactivate(event.id)
                                }
                              },
                            },
                          ]
                          : []),
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
          />
        </Modal>
      )}
    </>
  )
}

import { format } from 'date-fns'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { Edit, Trash2, User } from 'lucide-react'
import Avatar from '@mui/material/Avatar'
import { Stack, Typography } from '@mui/material'
import { RowActions } from '@/components/shared/table/RowActions'
import type { EventScheduleSlot, Event, InteractionType } from '@/types'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'

interface ScheduleSlotListProps {
  slots: EventScheduleSlot[]
  event: Event
  onRemove: (slotId: string, info: string) => void
  onEdit: (slot: EventScheduleSlot) => void
}

export function ScheduleSlotList({ slots, event, onRemove, onEdit }: ScheduleSlotListProps) {
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
            <TableCell align="right" sx={{ pr: 3 }}>
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {slots.map((slot) => {
            const dateStr = format(new Date(slot.startTime), 'EEE, MMM d, yyyy')
            const timeRange = `${format(new Date(slot.startTime), 'h:mm a')} – ${format(
              new Date(slot.endTime),
              'h:mm a'
            )}`

            const bookingCount = slot._count?.bookings ?? 0
            const caps = INTERACTION_TYPE_CAPS[event.interactionType as InteractionType]
            const effectiveCapacity = caps.multipleParticipants
              ? slot.capacity ?? event.maxParticipantCount
              : 1
            const isFull = effectiveCapacity !== null && bookingCount >= effectiveCapacity
            const canDelete = bookingCount === 0

            return (
              <TableRow key={slot.id} hover>
                <TableCell sx={{ fontWeight: 500, py: 2 }}>{dateStr}</TableCell>
                <TableCell sx={{ py: 2 }}>{timeRange}</TableCell>
                <TableCell sx={{ py: 2 }}>
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontWeight: 600,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: isFull ? 'error.lighter' : 'action.hover',
                      color: isFull ? 'error.main' : 'text.primary',
                      fontSize: '0.75rem',
                    }}
                  >
                    {bookingCount}
                    {effectiveCapacity ? ` / ${effectiveCapacity}` : ' seats'}
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 2 }}>
                  {(() => {
                    const overrideCoach = slot.assignedCoach
                    const isRotating = event.sessionLeadershipStrategy === 'ROTATING_LEAD'

                    const defaultCoach = (event.fixedLeadCoachId && !isRotating)
                      ? event.coaches.find((c) => c.coachUserId === event.fixedLeadCoachId)
                        ?.coachUser
                      : null

                    const host = overrideCoach || defaultCoach
                    const isOverride = !!overrideCoach

                    if (host) {
                      return (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar
                            src={host.avatarUrl ?? undefined}
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.875rem',
                              bgcolor: isOverride ? 'primary.main' : 'grey.200',
                              color: isOverride ? 'primary.contrastText' : 'text.primary',
                            }}
                          >
                            {host.firstName[0]}
                            {host.lastName[0]}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                lineHeight: 1.2,
                                color: 'text.primary',
                              }}
                            >
                              {host.firstName} {host.lastName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: isOverride ? 'primary.main' : 'text.secondary',
                                fontWeight: isOverride ? 600 : 400,
                              }}
                            >
                              {isOverride ? 'Session Host (Override)' : 'Event Lead (Default)'}
                            </Typography>
                          </Box>
                        </Stack>
                      )
                    }

                    return (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.7 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: 'action.hover',
                            color: 'text.secondary',
                          }}
                        >
                          <User size={16} />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                            Team Pool
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {event.assignmentStrategy === 'ROUND_ROBIN'
                              ? 'Round Robin Rotation'
                              : 'Automatic Assignment'}
                          </Typography>
                        </Box>
                      </Stack>
                    )
                  })()}
                </TableCell>
                <TableCell align="right" sx={{ py: 2, pr: 3 }}>
                  <RowActions
                    actions={[
                      {
                        label: 'Edit Session',
                        icon: <Edit size={16} />,
                        onClick: () => onEdit(slot),
                      },
                      {
                        label: 'Delete Session',
                        icon: <Trash2 size={16} />,
                        color: 'error.main',
                        onClick: () => onRemove(slot.id, `${dateStr} at ${timeRange}`),
                        disabled: !canDelete,
                        tooltip: !canDelete
                          ? 'Cannot delete session with active bookings. Request everyone to cancel first.'
                          : undefined,
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

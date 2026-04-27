import { format } from 'date-fns'
import Box from '@mui/material/Box'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import { Edit, Trash2, User, RefreshCw, ClipboardList, Users, Ban } from 'lucide-react'
import Avatar from '@mui/material/Avatar'
import { Stack, Typography, Tooltip } from '@mui/material'
import { RowActions } from '@/components/shared/table/RowActions'
import type { EventScheduleSlot, Event, InteractionType } from '@/types'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'

interface ScheduleSlotRowProps {
  slot: EventScheduleSlot
  event: Event
  onRemove: (slotId: string, info: string) => void
  onEdit: (slot: EventScheduleSlot) => void
  onViewAttendees: (slot: EventScheduleSlot) => void
  onLogSession: (slot: EventScheduleSlot) => void
  onCancel: (slot: EventScheduleSlot, info: string) => void
}

/**
 * Individual row for the ScheduleSlotList table.
 * Encapsulates date formatting, occupancy logic, status badges, and host assignment display.
 */
export function ScheduleSlotRow({
  slot,
  event,
  onRemove,
  onEdit,
  onViewAttendees,
  onLogSession,
  onCancel,
}: ScheduleSlotRowProps) {
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
  const isRecurring = !!slot.recurrenceGroupId

  const renderStatus = () => {
    const now = new Date()
    const isPast = new Date(slot.endTime) < now

    if (slot.isCancelled) {
      return (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'error.lighter',
            color: 'error.main',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          Session Cancelled
        </Box>
      )
    }

    if (isPast) {
      return (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'action.hover',
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          Session Ended
        </Box>
      )
    }

    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          bgcolor: 'success.lighter',
          color: 'success.main',
          fontSize: '0.75rem',
          fontWeight: 700,
        }}
      >
        Accepting Bookings
      </Box>
    )
  }

  const renderCoach = () => {
    const overrideCoach = slot.assignedCoach
    const isRotating = event.sessionLeadershipStrategy === 'ROTATING_LEAD'

    const defaultCoach =
      event.fixedLeadCoachId && !isRotating
        ? event.coaches.find((c) => c.coachUserId === event.fixedLeadCoachId)?.coachUser
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
              sx={{ fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }}
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
  }

  return (
    <TableRow hover>
      <TableCell sx={{ py: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {dateStr}
          </Typography>
          {isRecurring && (
            <Tooltip title="Part of a recurring series">
              <RefreshCw size={14} style={{ color: '#6366f1' }} />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
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
      <TableCell sx={{ py: 2 }}>{renderCoach()}</TableCell>
      <TableCell sx={{ py: 2 }}>{renderStatus()}</TableCell>
      <TableCell sx={{ py: 2 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: slot.sessionLog ? 'info.lighter' : 'grey.100',
            color: slot.sessionLog ? 'info.main' : 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {slot.sessionLog ? 'Logged' : 'Not Logged'}
        </Box>
      </TableCell>
      <TableCell align="right" sx={{ py: 2, pr: 3 }}>
        <RowActions
          actions={[
            {
              label: 'View Attendees',
              icon: <Users size={16} />,
              onClick: () => onViewAttendees(slot),
            },
            {
              label: 'Log Session',
              icon: <ClipboardList size={16} />,
              onClick: () => onLogSession(slot),
            },
            {
              label: 'Edit Session',
              icon: <Edit size={16} />,
              onClick: () => onEdit(slot),
            },
            {
              label: 'Cancel Session',
              icon: <Ban size={16} />,
              color: 'error.main',
              onClick: () => onCancel(slot, `${dateStr} at ${timeRange}`),
              disabled: slot.isCancelled,
              tooltip: slot.isCancelled
                ? 'Session is already cancelled'
                : 'Cancel this session and notify all participants',
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
}

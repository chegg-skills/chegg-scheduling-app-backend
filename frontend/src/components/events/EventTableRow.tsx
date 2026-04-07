import Avatar from '@mui/material/Avatar'
import AvatarGroup from '@mui/material/AvatarGroup'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import { alpha, useTheme } from '@mui/material/styles'
import { Calendar, Copy, Edit, Eye, EyeOff, Trash2 } from 'lucide-react'
import { Link as RouterLink } from 'react-router-dom'
import { Badge } from '@/components/shared/Badge'
import { RowActions } from '@/components/shared/RowActions'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import type { Event } from '@/types'
import { formatEventDuration } from './eventTableUtils'

interface EventTableRowProps {
  event: Event
  onDelete: (event: Event) => void | Promise<void>
  onEdit: (event: Event) => void
  onDuplicate: (event: Event) => void
  onToggleActive: (event: Event) => void | Promise<void>
  onViewUser?: (userId: string) => void
}

function getHostInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`
}

export function EventTableRow({
  event,
  onDelete,
  onEdit,
  onDuplicate,
  onToggleActive,
  onViewUser,
}: EventTableRowProps) {
  const theme = useTheme()

  return (
    <TableRow hover>
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
        {formatEventDuration(event.durationSeconds)}
      </TableCell>

      <TableCell>
        <AvatarGroup
          max={4}
          sx={{
            justifyContent: 'flex-end',
            '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem' },
          }}
        >
          {event.hosts.map((host) => (
            <Tooltip
              key={host.id}
              title={`${host.hostUser.firstName} ${host.hostUser.lastName} (${host.hostUser.email})`}
              arrow
            >
              <Avatar
                onClick={() => onViewUser?.(host.hostUser.id)}
                sx={{
                  bgcolor: 'secondary.light',
                  color: 'secondary.dark',
                  textDecoration: 'none',
                  cursor: onViewUser ? 'pointer' : 'default',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
              >
                {getHostInitials(host.hostUser.firstName, host.hostUser.lastName)}
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
        <Badge label={event.isActive ? 'Active' : 'Inactive'} variant={event.isActive ? 'green' : 'red'} />
      </TableCell>
      <TableCell>
        <PublicBookingLinkCell type="event" slug={event.publicBookingSlug} isActive={event.isActive} />
      </TableCell>

      <TableCell>
        <RowActions
          actions={[
            {
              label: 'Edit event details',
              icon: <Edit size={16} />,
              onClick: () => onEdit(event),
            },
            {
              label: 'Duplicate event',
              icon: <Copy size={16} />,
              onClick: () => onDuplicate(event),
            },
            {
              label: event.isActive ? 'Mark as Inactive' : 'Mark as Active',
              icon: event.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
              onClick: () => onToggleActive(event),
            },
            {
              label: 'Delete event',
              icon: <Trash2 size={16} />,
              color: 'error.main',
              onClick: () => onDelete(event),
            },
          ]}
        />
      </TableCell>
    </TableRow>
  )
}

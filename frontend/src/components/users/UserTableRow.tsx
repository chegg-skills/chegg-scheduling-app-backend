import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { Edit, Eye, Trash2 } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { RowActions } from '@/components/shared/RowActions'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import type { SafeUser } from '@/types'
import { getUserRoleBadgeProps, getUserStatusBadgeProps } from './userTableUtils'

interface UserTableRowProps {
  canDeactivate: boolean
  onDeactivate: (user: SafeUser) => void | Promise<void>
  onEdit: (user: SafeUser) => void
  onView: (userId: string) => void
  user: SafeUser
}

export function UserTableRow({
  canDeactivate,
  onDeactivate,
  onEdit,
  onView,
  user,
}: UserTableRowProps) {
  return (
    <TableRow hover>
      <TableCell>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={user.avatarUrl ?? undefined}
            sx={{
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              bgcolor: 'primary.light',
              color: 'primary.dark',
              fontWeight: 600,
            }}
          >
            {user.firstName[0]}
            {user.lastName[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Stack>
      </TableCell>

      <TableCell>
        <Badge {...getUserRoleBadgeProps(user.role)} />
      </TableCell>
      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>{user.country ?? '—'}</TableCell>
      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {user.timezone.replace(/_/g, ' ')}
      </TableCell>
      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {user.preferredLanguage ?? '—'}
      </TableCell>
      <TableCell>
        <Badge {...getUserStatusBadgeProps(user.isActive)} />
      </TableCell>
      <TableCell>
        {user.role === 'COACH' ? (
          <PublicBookingLinkCell type="coach" slug={user.publicBookingSlug} isActive={user.isActive} />
        ) : (
          <Typography variant="caption" color="text.disabled">
            N/A
          </Typography>
        )}
      </TableCell>
      <TableCell>
        <RowActions
          actions={[
            {
              label: 'View Details',
              icon: <Eye size={16} />,
              onClick: () => onView(user.id),
            },
            {
              label: 'Edit',
              icon: <Edit size={16} />,
              onClick: () => onEdit(user),
            },
            ...(canDeactivate
              ? [
                {
                  label: 'Deactivate',
                  icon: <Trash2 size={16} />,
                  color: 'error.main',
                  onClick: () => onDeactivate(user),
                },
              ]
              : []),
          ]}
        />
      </TableCell>
    </TableRow>
  )
}

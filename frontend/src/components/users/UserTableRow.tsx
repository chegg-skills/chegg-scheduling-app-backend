import TableCell from '@mui/material/TableCell'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { Edit, Eye, Trash2 } from 'lucide-react'
import { Badge } from '@/components/shared/ui/Badge'
import { UserIdentity } from '@/components/shared/ui/UserIdentity'
import { RowActions } from '@/components/shared/table/RowActions'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import type { SafeUser } from '@/types'
import {
  getUserRoleBadgeProps,
  getUserStatusBadgeProps,
  getZoomExpiryLabel,
} from './userTableUtils'
import { useTimezones } from '@/hooks/queries/useConfig'
import { formatTimezoneLabel } from './userSystemFieldUtils'

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
  const { data: timezones = [] } = useTimezones()
  return (
    <TableRow hover>
      <TableCell>
        <UserIdentity
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          avatarUrl={user.avatarUrl}
          titleCase
          onClick={() => onView(user.id)}
        />
      </TableCell>

      <TableCell>
        <Badge {...getUserRoleBadgeProps(user.role)} />
      </TableCell>
      <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {formatTimezoneLabel(user.timezone, timezones)}
      </TableCell>
      <TableCell>
        <Badge {...getUserStatusBadgeProps(user.isActive)} />
      </TableCell>
      <TableCell>
        <Badge {...getZoomExpiryLabel(user.zoomIsvLinkExpiresAt)} />
      </TableCell>
      <TableCell>
        {user.role === 'COACH' ? (
          <PublicBookingLinkCell
            type="coach"
            slug={user.publicBookingSlug}
            isActive={user.isActive}
          />
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
              label: 'View details',
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

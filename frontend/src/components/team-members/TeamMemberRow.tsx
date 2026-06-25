import type { TeamMember, UserRole } from '@/types'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { UserMinus } from 'lucide-react'
import { Badge } from '@/components/shared/ui/Badge'
import { UserIdentity } from '@/components/shared/ui/UserIdentity'
import { RowActions } from '@/components/shared/table/RowActions'
import { usePermissions } from '@/hooks/usePermissions'

interface TeamMemberRowProps {
  member: TeamMember
  currentUserRole: UserRole
  teamLeadId: string
  onRemove: (userId: string, name: string) => void
  onViewUser?: (userId: string) => void
  sessionCount?: number
}

export function TeamMemberRow({
  member,
  currentUserRole,
  teamLeadId,
  onRemove,
  onViewUser,
  sessionCount,
}: TeamMemberRowProps) {
  const { user } = member
  const isLead = user.id === teamLeadId
  const { isCoach, userId } = usePermissions()
  const isSelf = user.id === userId
  const canView = onViewUser && (!isCoach || isSelf)
  const canManage = currentUserRole !== 'COACH'

  return (
    <TableRow hover>
      {/* Member Identity Details Column */}
      <TableCell>
        <UserIdentity
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          onClick={canView ? () => onViewUser?.(user.id) : undefined}
          avatarSx={{ fontSize: 12, fontWeight: 700 }}
        />
      </TableCell>

      {/* Role details column */}
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <Badge label={user.role.replace('_', ' ')} color="gray" />
          {isLead && <Badge label="Lead" color="blue" />}
        </Stack>
      </TableCell>

      {/* Workload Session Count details column */}
      <TableCell sx={{ fontSize: '0.8125rem', color: 'text.primary' }}>
        {sessionCount !== undefined ? sessionCount : '—'}
      </TableCell>

      {/* Action Row Buttons Column */}
      {canManage && (
        <TableCell align="right">
          <RowActions
            actions={[
              {
                label: 'Remove',
                icon: <UserMinus size={16} />,
                color: 'error.main',
                disabled: isLead,
                onClick: () => onRemove(user.id, `${user.firstName} ${user.lastName}`),
              },
            ]}
          />
        </TableCell>
      )}
    </TableRow>
  )
}

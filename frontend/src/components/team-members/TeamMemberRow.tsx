import type { TeamMember, UserRole } from '@/types'
import ListItem from '@mui/material/ListItem'
import Stack from '@mui/material/Stack'
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
}

export function TeamMemberRow({
  member,
  currentUserRole,
  teamLeadId,
  onRemove,
  onViewUser,
}: TeamMemberRowProps) {
  const { user } = member
  const isLead = user.id === teamLeadId
  const { isCoach, userId } = usePermissions()
  const isSelf = user.id === userId
  const canView = onViewUser && (!isCoach || isSelf)

  return (
    <ListItem
      divider
      secondaryAction={
        currentUserRole !== 'COACH' ? (
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
        ) : undefined
      }
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        sx={{ width: '100%', pr: currentUserRole !== 'COACH' ? 8 : 0 }}
      >
        <UserIdentity
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          onClick={canView ? () => onViewUser?.(user.id) : undefined}
          avatarSx={{ fontSize: 12, fontWeight: 700 }}
        />
        <Stack direction="row" spacing={1.5} alignItems="center">
          {isLead && <Badge label="Lead" color="blue" />}
          <Badge label={user.role.replace('_', ' ')} color="gray" />
        </Stack>
      </Stack>
    </ListItem>
  )
}

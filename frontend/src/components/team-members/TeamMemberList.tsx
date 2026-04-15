import type { TeamMember, UserRole } from '@/types'
import List from '@mui/material/List'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useRemoveTeamMember } from '@/hooks/useTeamMembers'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { TeamMemberRow } from './TeamMemberRow'

interface TeamMemberListProps {
  teamId: string
  members: TeamMember[]
  currentUserRole: UserRole
  teamLeadId: string
  onViewUser?: (userId: string) => void
}

export function TeamMemberList({
  teamId,
  members,
  currentUserRole,
  teamLeadId,
  onViewUser,
}: TeamMemberListProps) {
  const { mutate: remove } = useRemoveTeamMember(teamId)
  const { handleAction } = useAsyncAction()

  if (members.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No members yet.
      </Typography>
    )
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (a.userId === teamLeadId) return -1
    if (b.userId === teamLeadId) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const handleRemove = (userId: string, name: string) => {
    handleAction(remove, userId, {
      title: 'Remove member',
      message: `Are you sure you want to remove ${name} from this team?`,
      actionName: 'Removal',
    })
  }

  return (
    <Paper variant="outlined">
      <List disablePadding>
        {sortedMembers.map((member) => (
          <TeamMemberRow
            key={member.id}
            member={member}
            currentUserRole={currentUserRole}
            teamLeadId={teamLeadId}
            onRemove={handleRemove}
            onViewUser={onViewUser}
          />
        ))}
      </List>
    </Paper>
  )
}

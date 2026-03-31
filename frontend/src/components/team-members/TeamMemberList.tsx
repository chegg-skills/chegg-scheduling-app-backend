import type { TeamMember, UserRole } from '@/types'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { UserMinus } from 'lucide-react'
import { Badge } from '@/components/shared/Badge'
import { useRemoveTeamMember } from '@/hooks/useTeamMembers'
import { useConfirm } from '@/context/ConfirmContext'
import { RowActions } from '@/components/shared/RowActions'

interface TeamMemberListProps {
  teamId: string
  members: TeamMember[]
  currentUserRole: UserRole
  teamLeadId: string
}

export function TeamMemberList({ teamId, members, currentUserRole, teamLeadId }: TeamMemberListProps) {
  const { mutate: remove } = useRemoveTeamMember(teamId)
  const { confirm } = useConfirm()

  if (members.length === 0) {
    return <Typography variant="body2" color="text.secondary">No members yet.</Typography>
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (a.userId === teamLeadId) return -1
    if (b.userId === teamLeadId) return 1
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  return (
    <Paper variant="outlined">
      <List disablePadding>
        {sortedMembers.map(({ id, user }) => {
          const isLead = user.id === teamLeadId

          return (
            <ListItem key={id} divider secondaryAction={currentUserRole !== 'COACH' ? (
              <RowActions
                actions={[
                  {
                    label: 'Remove',
                    icon: <UserMinus size={16} />,
                    color: 'error.main',
                    disabled: isLead,
                    onClick: async () => {
                      if (await confirm({
                        title: 'Remove Member',
                        message: `Are you sure you want to remove ${user.firstName} ${user.lastName} from this team?`
                      })) {
                        remove(user.id)
                      }
                    },
                  },
                ]}
              />
            ) : undefined}>
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ width: '100%', pr: currentUserRole !== 'COACH' ? 8 : 0 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.dark', width: 36, height: 36, fontSize: 12, fontWeight: 700 }}>
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {user.firstName} {user.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  {isLead && <Badge label="Lead" variant="blue" />}
                  <Badge label={user.role.replace('_', ' ')} variant="gray" />
                </Stack>
              </Stack>
            </ListItem>
          )
        })}
      </List>
    </Paper>
  )
}

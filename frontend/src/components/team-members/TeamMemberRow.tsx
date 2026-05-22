import type { TeamMember, UserRole } from '@/types'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import ListItem from '@mui/material/ListItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { UserMinus } from 'lucide-react'
import { Badge } from '@/components/shared/ui/Badge'
import { RowActions } from '@/components/shared/table/RowActions'
import { useAuth } from '@/context/auth'

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
  const { user: currentUser } = useAuth()
  const isCoach = currentUser?.role === 'COACH'
  const isSelf = user.id === currentUser?.id
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
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            sx={{
              bgcolor: 'primary.light',
              color: 'primary.dark',
              width: 36,
              height: 36,
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {user.firstName[0]}
            {user.lastName[0]}
          </Avatar>
          <Box>
            <Typography
              variant="body2"
              onClick={() => canView && onViewUser?.(user.id)}
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                textDecoration: 'none',
                cursor: canView ? 'pointer' : 'default',
                '&:hover': {
                  color: canView ? 'primary.main' : 'inherit',
                  textDecoration: canView ? 'underline' : 'none',
                },
              }}
            >
              {user.firstName} {user.lastName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {user.email}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {isLead && <Badge label="Lead" color="blue" />}
          <Badge label={user.role.replace('_', ' ')} color="gray" />
        </Stack>
      </Stack>
    </ListItem>
  )
}

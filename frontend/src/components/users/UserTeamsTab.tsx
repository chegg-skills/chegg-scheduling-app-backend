import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { Users } from 'lucide-react'
import type { UserWithDetails } from '@/types'
import { formatDate } from './userDetailUtils'
import { toTitleCase } from '@/utils/toTitleCase'

interface UserTeamsTabProps {
  user: UserWithDetails
}

export function UserTeamsTab({ user }: UserTeamsTabProps) {
  if (user.teamMemberships.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Users size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
        <Typography color="text.secondary" fontWeight={500}>
          This user is not a member of any teams.
        </Typography>
      </Box>
    )
  }

  return (
    <Grid container spacing={2}>
      {user.teamMemberships.map((membership) => (
        <Grid size={{ xs: 12, sm: 6 }} key={membership.id}>
          <Paper variant="outlined" sx={{ p: 2, '&:hover': { bgcolor: 'action.hover' } }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {toTitleCase(membership.team.name)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Joined {formatDate(membership.team.createdAt)}
            </Typography>
            {membership.team.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {membership.team.description}
              </Typography>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  )
}

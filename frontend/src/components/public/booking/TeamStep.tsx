import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import { Users } from 'lucide-react'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { toTitleCase } from '@/utils/toTitleCase'
import type { Team } from '@/types'

interface TeamStepProps {
  teams: Pick<Team, 'id' | 'name' | 'description'>[]
  loading: boolean
  error?: unknown
  selectedTeamId: string | null
  onSelect: (teamId: string) => void
}

export function TeamStep({ teams, loading, error, selectedTeamId, onSelect }: TeamStepProps) {
  if (loading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load categories." />

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
        gap: 1.5,
      }}
    >
      {teams.map((team) => (
        <Card
          key={team.id}
          variant="outlined"
          sx={{
            borderColor: selectedTeamId === team.id ? 'primary.main' : 'divider',
            borderWidth: selectedTeamId === team.id ? 2 : 1,
            borderRadius: 1,
          }}
        >
          <CardActionArea onClick={() => onSelect(team.id)}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{ p: 1, borderRadius: 1, bgcolor: 'primary.light', color: 'primary.main' }}
                >
                  <Users size={24} />
                </Box>
                <Box>
                  <Typography variant="h6">{toTitleCase(team.name)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {team.description}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  )
}

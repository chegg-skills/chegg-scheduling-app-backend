import * as React from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { Calendar, Users } from 'lucide-react'
import type { UserWithDetails } from '@/types'
import { Badge } from '@/components/shared/ui/Badge'
import { toTitleCase } from '@/utils/toTitleCase'

interface UserCoachedEventsTabProps {
  user: UserWithDetails
}

export function UserCoachedEventsTab({ user }: UserCoachedEventsTabProps) {
  if (user.coachedEvents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Calendar size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
        <Typography color="text.secondary" fontWeight={500}>
          This user is not coaching any events.
        </Typography>
      </Box>
    )
  }

  // Group coached events by team
  const eventsByTeam = React.useMemo(() => {
    const groups: Record<
      string,
      { teamId: string; teamName: string; events: typeof user.coachedEvents }
    > = {}

    user.coachedEvents.forEach((coachEvent) => {
      const teamId = coachEvent.event.team?.id || coachEvent.event.teamId || 'no-team'

      // Attempt to get the team name from the event's team relation,
      // and fall back to the user's teamMemberships if not populated.
      const teamName =
        coachEvent.event.team?.name ||
        user.teamMemberships.find((m) => m.team.id === coachEvent.event.teamId)?.team.name ||
        'Unassigned Team'

      if (!groups[teamId]) {
        groups[teamId] = {
          teamId,
          teamName,
          events: [],
        }
      }
      groups[teamId].events.push(coachEvent)
    })

    return Object.values(groups)
  }, [user.coachedEvents, user.teamMemberships])

  return (
    <Box>
      {eventsByTeam.map(({ teamId, teamName, events }) => (
        <Box key={teamId} sx={{ mb: 3.5, '&:last-child': { mb: 0 } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Users size={16} style={{ color: '#E87100' }} />
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              {toTitleCase(teamName)}
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {events.map((coachEvent) => (
              <Grid size={{ xs: 12, sm: 6 }} key={coachEvent.id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                    '&:hover': { bgcolor: 'action.hover' },
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                  }}
                >
                  <Box>
                    <Stack
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                      justifyContent="space-between"
                      sx={{ mb: 1 }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        color="text.primary"
                        sx={{ lineHeight: 1.3 }}
                      >
                        {toTitleCase(coachEvent.event.name)}
                      </Typography>
                      <Box sx={{ flexShrink: 0 }}>
                        <Badge label={toTitleCase(coachEvent.event.eventType.name)} color="blue" />
                      </Box>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {formatEnumLabel(coachEvent.event.interactionType)} •{' '}
                      {Math.round(coachEvent.event.durationSeconds / 60)} mins
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  )
}

function formatEnumLabel(val: string) {
  if (!val) return ''
  return val
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ')
}

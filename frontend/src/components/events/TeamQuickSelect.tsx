import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronRight, Users, EyeOff } from 'lucide-react'
import { Badge } from '@/components/shared/ui/Badge'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import { toTitleCase } from '@/utils/toTitleCase'
import type { Team, SafeUser } from '@/types'

interface TeamQuickSelectProps {
  teams: Team[]
  users: SafeUser[]
  onSelectTeam: (teamId: string) => void
}

export function TeamQuickSelect({ teams, users, onSelectTeam }: TeamQuickSelectProps) {
  const theme = useTheme()

  if (!teams || teams.length === 0) {
    return (
      <Box
        sx={{
          py: 8,
          px: 4,
          textAlign: 'center',
          borderRadius: 2, // 12px
          border: '1.5px dashed',
          borderColor: theme.palette.divider,
          backgroundColor: alpha(theme.palette.secondary.main, 0.01),
        }}
      >
        <Users size={40} style={{ color: theme.palette.text.disabled, marginBottom: 16 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          No Teams Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You are not currently assigned to any teams. Please create a team or ask an administrator
          to add you.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <SectionHeader
        title="Select a Team to View Events"
        description="Choose a team from the options below to manage schedules, view event configurations, and share direct booking links."
      />

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(auto-fill, minmax(280px, 1fr))',
          },
        }}
      >
        {teams.map((team) => {
          const isActive = team.isActive
          const leadUser = users.find((u) => u.id === team.teamLeadId)
          const leadName = leadUser ? `${leadUser.firstName} ${leadUser.lastName}` : 'No lead'

          return (
            <Card
              key={team.id}
              variant="outlined"
              onClick={() => onSelectTeam(team.id)}
              sx={{
                cursor: 'pointer',
                borderRadius: 2, // 12px
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'background.paper',
                borderColor: 'divider',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: isActive ? 'primary.main' : 'warning.main',
                  boxShadow: isActive
                    ? `0 12px 24px -4px ${alpha(theme.palette.primary.main, 0.08)}, 0 4px 12px -2px rgba(0,0,0,0.02)`
                    : `0 12px 24px -4px ${alpha(theme.palette.warning.main, 0.08)}, 0 4px 12px -2px rgba(0,0,0,0.02)`,
                },
              }}
            >
              <CardContent
                sx={{
                  p: 3,
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  '&:last-child': { pb: 3 },
                }}
              >
                {/* Header: Icon & Status Badge */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5, // 12px
                      backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.warning.main, 0.08),
                      color: isActive ? 'primary.main' : 'warning.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isActive ? <Users size={22} /> : <EyeOff size={22} />}
                  </Box>

                  <Badge
                    label={isActive ? 'Active' : 'Inactive'}
                    color={isActive ? 'green' : 'yellow'}
                  />
                </Box>

                {/* Team Details */}
                <Box sx={{ flexGrow: 1, mb: 3.5 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      color: 'text.primary',
                      mb: 1,
                      lineHeight: 1.2,
                    }}
                  >
                    {toTitleCase(team.name)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'text.secondary',
                    }}
                  >
                    {team.description || 'No description provided for this team.'}
                  </Typography>
                </Box>

                {/* Footer: Action Indicator & Team Lead Name */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: { xs: 1.5, sm: 2 },
                    mt: 'auto',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: isActive ? 'primary.main' : 'warning.main',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      transition: 'gap 0.2s ease',
                      '&:hover': {
                        gap: 1,
                      },
                    }}
                  >
                    <span>View Events</span>
                    <ChevronRight size={16} />
                  </Box>

                  {team.teamLeadId && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: alpha(theme.palette.text.secondary, 0.04),
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        alignSelf: { xs: 'flex-start', sm: 'auto' },
                        ml: { xs: 0, sm: 'auto' },
                      }}
                    >
                      <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>
                        Lead:
                      </Box>{' '}
                      {leadName}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          )
        })}
      </Box>
    </Box>
  )
}

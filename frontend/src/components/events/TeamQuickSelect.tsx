import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronRight, Users, User, EyeOff, Edit, Eye, Trash2 } from 'lucide-react'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import { RowActions } from '@/components/shared/table/RowActions'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'
import { toTitleCase } from '@/utils/toTitleCase'
import type { Team, SafeUser } from '@/types'

interface TeamQuickSelectProps {
  teams: Team[]
  users: SafeUser[]
  onSelectTeam: (teamId: string) => void
  title?: string
  description?: string
  actionLabel?: string
  showSectionHeader?: boolean
  canManageTeam?: boolean
  onEdit?: (team: Team) => void
  onToggleActive?: (team: Team) => void | Promise<void>
  onDelete?: (team: Team) => void | Promise<void>
}

export function TeamQuickSelect({
  teams,
  users,
  onSelectTeam,
  title = 'Select a Team to View Events',
  description = 'Choose a team from the options below to manage schedules, view event configurations, and share direct booking links.',
  actionLabel = 'View Events',
  showSectionHeader = true,
  canManageTeam = false,
  onEdit,
  onToggleActive,
  onDelete,
}: TeamQuickSelectProps) {
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
      {showSectionHeader && (
        <SectionHeader
          title={title}
          description={description}
        />
      )}

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
          const leadInitials = leadUser
            ? `${leadUser.firstName?.[0] ?? ''}${leadUser.lastName?.[0] ?? ''}`.toUpperCase()
            : ''

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
                overflow: 'hidden',
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
              {/* Header Box with dynamic background accent */}
              <Box
                sx={{
                  px: 3,
                  py: 2.25,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isActive
                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.accent.peach, 0.35)} 100%)`
                    : `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.06)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
                  borderBottom: '1.5px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Left Side: User Icon */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.25, // 10px
                    backgroundColor: isActive
                      ? alpha(theme.palette.primary.main, 0.1)
                      : alpha(theme.palette.secondary.main, 0.1),
                    color: isActive ? 'primary.main' : 'secondary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <User size={18} />
                </Box>

                {/* Right Side Actions: Active Button, Booking Link, Three-Dot Menu */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (canManageTeam && onToggleActive) {
                        onToggleActive(team)
                      }
                    }}
                    disabled={!canManageTeam || !onToggleActive}
                    sx={{
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      fontWeight: 700,
                      fontSize: '0.6875rem',
                      height: 24,
                      borderRadius: '6px',
                      px: 1.5,
                      minWidth: 'auto',
                      color: isActive ? 'success.dark' : 'error.dark',
                      backgroundColor: isActive
                        ? alpha(theme.palette.success.main, 0.12)
                        : alpha(theme.palette.error.main, 0.12),
                      border: 'none',
                      boxShadow: 'none',
                      cursor: canManageTeam && onToggleActive ? 'pointer' : 'default',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover':
                        canManageTeam && onToggleActive
                          ? {
                              backgroundColor: isActive
                                ? alpha(theme.palette.success.main, 0.2)
                                : alpha(theme.palette.error.main, 0.2),
                              transform: 'scale(1.05)',
                            }
                          : {},
                      '&.Mui-disabled': {
                        color: isActive ? 'success.dark' : 'error.dark',
                        opacity: 0.8,
                        backgroundColor: isActive
                          ? alpha(theme.palette.success.main, 0.08)
                          : alpha(theme.palette.error.main, 0.08),
                      },
                    }}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </Button>

                  <PublicBookingLinkCell
                    type="team"
                    slug={team.publicBookingSlug}
                    isActive={team.isActive}
                  />

                  {canManageTeam && onEdit && onToggleActive && onDelete && (
                    <RowActions
                      actions={[
                        {
                          label: 'Edit team details',
                          icon: <Edit size={16} />,
                          onClick: () => onEdit(team),
                        },
                        {
                          label: team.isActive ? 'Mark as inactive' : 'Mark as active',
                          icon: team.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                          onClick: () => onToggleActive(team),
                        },
                        {
                          label: 'Delete team',
                          icon: <Trash2 size={16} />,
                          color: 'error.main',
                          onClick: () => onDelete(team),
                        },
                      ]}
                    />
                  )}
                </Box>
              </Box>

              <CardContent
                sx={{
                  p: 3,
                  pt: 2.5,
                  flexGrow: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  '&:last-child': { pb: 3 },
                }}
              >

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
                    {team.description
                      ? team.description.length > 60
                        ? `${team.description.slice(0, 60)}...`
                        : team.description
                      : 'No description provided for this team.'}
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
                    <span>{actionLabel}</span>
                    <ChevronRight size={16} />
                  </Box>

                  {team.teamLeadId && (
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 1,
                        alignSelf: { xs: 'flex-start', sm: 'auto' },
                        ml: { xs: 0, sm: 'auto' },
                      }}
                    >
                      {leadUser && (
                        <Avatar
                          src={leadUser.avatarUrl ?? undefined}
                          sx={{
                            width: 24,
                            height: 24,
                            fontSize: '0.675rem',
                            bgcolor: 'primary.light',
                            color: 'primary.dark',
                            fontWeight: 700,
                          }}
                        >
                          {leadInitials}
                        </Avatar>
                      )}
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
                        }}
                      >
                        <Box component="span" sx={{ color: 'text.disabled', fontWeight: 400 }}>
                          Lead:
                        </Box>{' '}
                        {leadName}
                      </Typography>
                    </Box>
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

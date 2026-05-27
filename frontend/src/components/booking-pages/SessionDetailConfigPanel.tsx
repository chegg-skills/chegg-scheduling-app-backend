import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import { Tag, UsersRound, Check, Copy, ExternalLink } from 'lucide-react'
import type { BookingPage, SessionType, Team } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { alpha } from '@mui/material/styles'

interface SessionDetailConfigPanelProps {
  selectedSessionType: SessionType | undefined
  draftCategories: Map<string, Set<string>>
  bookingPage: BookingPage
  activeTeams: Team[]
  isSaving: boolean
  getEventCount: (sessionTypeId: string, teamId: string) => number
  getEventsForTeamAndSessionType: (sessionTypeId: string, teamId: string) => any[]
  handleTeamToggle: (sessionTypeId: string, teamId: string) => void
}

export function SessionDetailConfigPanel({
  selectedSessionType,
  draftCategories,
  bookingPage,
  activeTeams,
  isSaving,
  getEventCount,
  getEventsForTeamAndSessionType,
  handleTeamToggle,
}: SessionDetailConfigPanelProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [selectedSessionType])

  const sessionShareUrl = useMemo(() => {
    if (typeof window === 'undefined' || !selectedSessionType) return ''
    const origin = window.location.origin
    const base = bookingPage.slug === 'default'
      ? `${origin}/book`
      : `${origin}/book/page/${bookingPage.slug}`
    return `${base}?category=${selectedSessionType.id}`
  }, [bookingPage.slug, selectedSessionType])

  if (!selectedSessionType) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'text.secondary',
          py: 6,
        }}
      >
        <Tag size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          No Session Selected
        </Typography>
        <Typography variant="body2">
          Select a session type from the left column to view its team configurations.
        </Typography>
      </Box>
    )
  }

  const isEnabled = draftCategories.has(selectedSessionType.id)
  const draftTeamIds = draftCategories.get(selectedSessionType.id)

  // UI Warning checks
  const isOriginalEnabled = bookingPage.sections.some(
    (s) => s.sessionTypeId === selectedSessionType.id
  )
  const isPendingRemoval = isOriginalEnabled && !isEnabled
  const hasNoTeams = isEnabled && (!draftTeamIds || draftTeamIds.size === 0)

  return (
    <Stack spacing={2.5} sx={{ pt: 0.5 }}>
      {/* Selected Session Info */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mb: 1.5, flexWrap: 'wrap', gap: 1.5 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {toTitleCase(selectedSessionType.name)}
            </Typography>
            <Chip
              label={isEnabled ? 'Enabled' : 'Disabled'}
              size="small"
              color={isEnabled ? 'primary' : 'default'}
              sx={{ fontWeight: 600, height: 20 }}
            />
          </Stack>

          {isEnabled && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                onClick={async (e) => {
                  e.stopPropagation()
                  if (!sessionShareUrl) return
                  await navigator.clipboard.writeText(sessionShareUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  height: 28,
                  borderRadius: 1.2,
                  px: 1.25,
                  borderColor: (theme) => copied ? theme.palette.success.main : 'divider',
                  bgcolor: (theme) =>
                    copied ? alpha(theme.palette.success.main, 0.08) : 'transparent',
                  color: (theme) => (copied ? theme.palette.success.main : 'text.secondary'),
                  '&:hover': {
                    bgcolor: (theme) =>
                      copied ? alpha(theme.palette.success.main, 0.08) : 'action.hover',
                    color: (theme) => (copied ? theme.palette.success.main : 'primary.main'),
                    borderColor: (theme) =>
                      copied ? theme.palette.success.main : 'primary.main',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation()
                  if (!sessionShareUrl) return
                  window.open(sessionShareUrl, '_blank', 'noopener,noreferrer')
                }}
                startIcon={<ExternalLink size={14} />}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  height: 28,
                  borderRadius: 1.2,
                  px: 1.25,
                  color: 'text.secondary',
                  borderColor: 'divider',
                  bgcolor: 'transparent',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    color: 'primary.main',
                    borderColor: 'primary.main',
                    transform: 'scale(1.02)',
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                Open link
              </Button>
            </Stack>
          )}
        </Stack>
        {selectedSessionType.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {selectedSessionType.description}
          </Typography>
        )}
      </Box>
      <Divider />

      {/* Warnings for Selected Session */}
      {isPendingRemoval && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: (theme) => alpha(theme.palette.error.main, 0.05),
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.error.main, 0.15),
            color: 'error.main',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            ⚠️ Session and all team mappings will be permanently removed from this page on save.
          </Typography>
        </Box>
      )}

      {hasNoTeams && (
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            bgcolor: (theme) => alpha(theme.palette.warning.main, 0.05),
            border: '1px solid',
            borderColor: (theme) => alpha(theme.palette.warning.main, 0.15),
            color: 'warning.main',
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
            ⚠️ No teams checked. This session will not appear on the student site until you assign at least one team.
          </Typography>
        </Box>
      )}

      {/* Teams / Disciplines Grid or Disabled state message */}
      {!isEnabled ? (
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: 'grey.50',
            borderStyle: 'dashed',
            borderRadius: 1,
          }}
        >
          <UsersRound size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Teams Configuration Disabled
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Enable this session type using the switch in the left column to select and assign participating teams.
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              display: 'block',
              mb: 1.5,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Participating Teams / Disciplines
          </Typography>

          {activeTeams.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
              No active teams available in the workspace.
            </Typography>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: '1fr 1fr',
                },
                gap: 1.5,
              }}
            >
              {activeTeams.map((team) => {
                const isAssigned = draftTeamIds?.has(team.id) ?? false
                const eventCount = getEventCount(selectedSessionType.id, team.id)

                return (
                  <Paper
                    key={team.id}
                    variant="outlined"
                    onClick={() => handleTeamToggle(selectedSessionType.id, team.id)}
                    sx={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      p: 1.5,
                      borderRadius: 1,
                      cursor: isSaving ? 'not-allowed' : 'pointer',
                      border: '1px solid',
                      borderColor: isAssigned ? 'primary.main' : 'divider',
                      bgcolor: isAssigned ? 'accent.peach' : 'background.paper',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      opacity: isSaving ? 0.7 : 1,
                      '&:hover': !isSaving
                        ? {
                            borderColor: 'primary.main',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(232, 113, 0, 0.05)',
                          }
                        : {},
                    }}
                  >
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mr: 1.5,
                        mt: 0.25,
                      }}
                    >
                      <Checkbox
                        checked={isAssigned}
                        disabled={isSaving}
                        size="small"
                        color="primary"
                        sx={{
                          pointerEvents: 'none',
                          p: 0,
                        }}
                      />
                    </Box>
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <UsersRound
                          size={15}
                          style={{
                            color: isAssigned ? '#E87100' : '#5F6368',
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{
                            fontWeight: 700,
                            color: isAssigned ? 'primary.main' : 'text.primary',
                          }}
                        >
                          {toTitleCase(team.name)}
                        </Typography>
                      </Stack>

                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontWeight: 600,
                          color: eventCount > 0 ? 'text.secondary' : 'error.main',
                        }}
                      >
                        {eventCount > 0
                          ? `${eventCount} session${eventCount !== 1 ? 's' : ''} available`
                          : '⚠️ 0 sessions (needs setup)'}
                      </Typography>
                      {eventCount > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {getEventsForTeamAndSessionType(selectedSessionType.id, team.id).map((evt) => (
                            <Chip
                              key={evt.id}
                              label={evt.name}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                bgcolor: 'background.paper',
                                borderColor: alpha('#E87100', 0.25),
                                color: '#E87100',
                                '& .MuiChip-label': {
                                  px: 1,
                                },
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Paper>
                )
              })}
            </Box>
          )}
        </Box>
      )}
    </Stack>
  )
}

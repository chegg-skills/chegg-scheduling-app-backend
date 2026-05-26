import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import { Tag, UsersRound } from 'lucide-react'
import type { BookingPage, BookingPageSection, SessionType, Team } from '@/types'
import { useSessionTypes } from '@/hooks/queries/useSessionTypes'
import { useTeams } from '@/hooks/queries/useTeams'
import { useEvents } from '@/hooks/queries/useEvents'
import { useQueryClient } from '@tanstack/react-query'
import { bookingPageKeys } from '@/hooks/queries/useBookingPages'
import { bookingPagesApi } from '@/api/bookingPages'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { extractApiError } from '@/utils/apiError'
import { motion, AnimatePresence } from 'framer-motion'
import { alpha } from '@mui/material/styles'

interface BookingPageSectionEditorProps {
  bookingPage: BookingPage
  onClose: () => void
  onSavingChange?: (saving: boolean) => void
  onDirtyChange?: (isDirty: boolean) => void
}

export function BookingPageSectionEditor({
  bookingPage,
  onClose,
  onSavingChange,
  onDirtyChange,
}: BookingPageSectionEditorProps) {
  const qc = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Local draft state: Map of sessionTypeId -> Set of teamIds
  const [draftCategories, setDraftCategories] = useState<Map<string, Set<string>>>(() => {
    const map = new Map<string, Set<string>>()
    bookingPage.sections.forEach((section) => {
      const teamIds = new Set(section.teams.map((t) => t.teamId))
      map.set(section.sessionTypeId, teamIds)
    })
    return map
  })

  const { data: allSessionTypes = [] } = useSessionTypes()
  const teamsResult = useTeams({ pageSize: 200 })
  const allTeams: Team[] = teamsResult.data?.teams ?? []

  // Fetch all events to display actual counts on team cards
  const { data: eventsData } = useEvents({ page: 1, pageSize: 500 })
  const allEvents = eventsData?.events ?? []

  const activeSessionTypes = allSessionTypes.filter((st) => st.isActive)
  const activeTeams = allTeams.filter((t) => t.isActive)

  const getEventCount = (sessionTypeId: string, teamId: string) => {
    return allEvents.filter(
      (e) => e.teamId === teamId && e.sessionTypeId === sessionTypeId && e.isActive
    ).length
  }

  const getEventsForTeamAndSessionType = (sessionTypeId: string, teamId: string) => {
    return allEvents.filter(
      (e) => e.teamId === teamId && e.sessionTypeId === sessionTypeId && e.isActive
    )
  }

  // Calculate if local draft state has changes compared to original bookingPage sections
  useEffect(() => {
    const origSectionsMap = new Map<string, Set<string>>()
    bookingPage.sections.forEach((s) => {
      origSectionsMap.set(s.sessionTypeId, new Set(s.teams.map((t) => t.teamId)))
    })

    let isDirty = false

    if (draftCategories.size !== origSectionsMap.size) {
      isDirty = true
    } else {
      // Compare each category and their teams
      for (const [sessionTypeId, teamIds] of draftCategories) {
        const origTeamIds = origSectionsMap.get(sessionTypeId)
        if (!origTeamIds) {
          isDirty = true
          break
        }
        if (teamIds.size !== origTeamIds.size) {
          isDirty = true
          break
        }
        for (const teamId of teamIds) {
          if (!origTeamIds.has(teamId)) {
            isDirty = true
            break
          }
        }
        if (isDirty) break
      }
    }

    onDirtyChange?.(isDirty)
  }, [draftCategories, bookingPage.sections, onDirtyChange])

  useEffect(() => {
    onSavingChange?.(isSaving)
  }, [isSaving, onSavingChange])

  const handleSectionToggle = (sessionTypeId: string) => {
    if (isSaving) return
    setDraftCategories((prev) => {
      const next = new Map(prev)
      if (next.has(sessionTypeId)) {
        next.delete(sessionTypeId)
      } else {
        next.set(sessionTypeId, new Set())
      }
      return next
    })
  }

  const handleTeamToggle = (sessionTypeId: string, teamId: string) => {
    if (isSaving) return
    setDraftCategories((prev) => {
      const next = new Map(prev)
      const teamIds = next.get(sessionTypeId)
      if (teamIds) {
        const nextTeamIds = new Set(teamIds)
        if (nextTeamIds.has(teamId)) {
          nextTeamIds.delete(teamId)
        } else {
          nextTeamIds.add(teamId)
        }
        next.set(sessionTypeId, nextTeamIds)
      }
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)

    // Compute differences
    const sectionsToAdd: string[] = []
    draftCategories.forEach((_, sessionTypeId) => {
      if (!bookingPage.sections.some((s) => s.sessionTypeId === sessionTypeId)) {
        sectionsToAdd.push(sessionTypeId)
      }
    })

    const sectionsToRemove: { id: string; name: string }[] = []
    bookingPage.sections.forEach((section) => {
      if (!draftCategories.has(section.sessionTypeId)) {
        sectionsToRemove.push({ id: section.id, name: section.sessionType.name })
      }
    })

    try {
      // 1. Process sections to remove
      for (const section of sectionsToRemove) {
        await bookingPagesApi.removeSection(bookingPage.id, section.id)
      }

      // 2. Process sections to add & their teams
      for (const sessionTypeId of sectionsToAdd) {
        const response = await bookingPagesApi.addSection(bookingPage.id, { sessionTypeId })
        const updatedPage = response.data.data?.bookingPage
        const newSection = updatedPage?.sections.find((s) => s.sessionTypeId === sessionTypeId)
        if (newSection) {
          const draftTeamIds = draftCategories.get(sessionTypeId) ?? new Set()
          for (const teamId of draftTeamIds) {
            await bookingPagesApi.addTeamToSection(bookingPage.id, newSection.id, { teamId })
          }
        }
      }

      // 3. Process existing sections (teams to add & remove)
      for (const section of bookingPage.sections) {
        if (draftCategories.has(section.sessionTypeId)) {
          const draftTeamIds = draftCategories.get(section.sessionTypeId) ?? new Set()
          const origTeamIds = new Set(section.teams.map((t) => t.teamId))

          // Teams to add
          for (const teamId of draftTeamIds) {
            if (!origTeamIds.has(teamId)) {
              await bookingPagesApi.addTeamToSection(bookingPage.id, section.id, { teamId })
            }
          }

          // Teams to remove
          for (const teamId of origTeamIds) {
            if (!draftTeamIds.has(teamId)) {
              await bookingPagesApi.removeTeamFromSection(bookingPage.id, section.id, teamId)
            }
          }
        }
      }

      // Invalidate Query Cache to update all booking page tables and components
      await qc.invalidateQueries({ queryKey: bookingPageKeys.all })

      // Successfully saved! Close the modal
      onClose()
    } catch (err) {
      setErrorMessage(extractApiError(err))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box
      component="form"
      id="booking-page-sections-form"
      onSubmit={(e) => {
        e.preventDefault()
        handleSave()
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
            Manage Booking Directory Sessions & Teams
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure sessions and participating teams. Click "Save Changes" at the bottom to apply all changes, or "Cancel" to discard.
          </Typography>
        </Box>

        {errorMessage && (
          <Box sx={{ mb: 2 }}>
            <ErrorAlert message={errorMessage} />
          </Box>
        )}

        <Stack spacing={2.5} sx={{ maxHeight: '48vh', overflow: 'auto', pr: 0.5, pb: 1 }}>
          {activeSessionTypes.map((sessionType) => {
            const draftTeamIds = draftCategories.get(sessionType.id)
            const isEnabled = draftCategories.has(sessionType.id)

            // UI Warning checks
            const isOriginalEnabled = bookingPage.sections.some(
              (s) => s.sessionTypeId === sessionType.id
            )
            const isPendingRemoval = isOriginalEnabled && !isEnabled
            const hasNoTeams = isEnabled && (!draftTeamIds || draftTeamIds.size === 0)

            return (
              <Paper
                key={sessionType.id}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  borderColor: isPendingRemoval
                    ? 'error.main'
                    : isEnabled
                      ? 'divider'
                      : 'grey.200',
                  bgcolor: isPendingRemoval
                    ? (theme) => alpha(theme.palette.error.main, 0.01)
                    : isEnabled
                      ? 'background.paper'
                      : 'grey.50',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Category Header Row */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: isPendingRemoval
                          ? 'error.light'
                          : isEnabled
                            ? 'primary.light'
                            : 'grey.200',
                        color: isPendingRemoval
                          ? 'error.main'
                          : isEnabled
                            ? 'primary.main'
                            : 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Tag size={20} />
                    </Box>
                    <Box>
                      <Typography
                        variant="body1"
                        sx={{
                          fontWeight: 700,
                          color: isPendingRemoval
                            ? 'error.main'
                            : isEnabled
                              ? 'text.primary'
                              : 'text.secondary',
                        }}
                      >
                        {sessionType.name}
                      </Typography>
                      {sessionType.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {sessionType.description}
                        </Typography>
                      )}
                    </Box>
                  </Stack>

                  <Box
                    sx={{
                      width: 58,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Switch
                      checked={isEnabled}
                      onChange={() => handleSectionToggle(sessionType.id)}
                      disabled={isSaving}
                      color="primary"
                    />
                  </Box>
                </Stack>

                {/* Warnings Row */}
                {isPendingRemoval && (
                  <Box
                    sx={{
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
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
                      mt: 2,
                      p: 1.5,
                      borderRadius: 2,
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

                {/* Collapsible Teams Grid */}
                <AnimatePresence initial={false}>
                  {isEnabled && draftTeamIds && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <Box sx={{ mt: 2.5 }}>
                        <Divider sx={{ mb: 2 }} />
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
                                md: '1fr 1fr 1fr',
                              },
                              gap: 1.5,
                            }}
                          >
                            {activeTeams.map((team) => {
                              const isAssigned = draftTeamIds.has(team.id)
                              const eventCount = getEventCount(sessionType.id, team.id)

                              return (
                                <Paper
                                  key={team.id}
                                  variant="outlined"
                                  onClick={() => handleTeamToggle(sessionType.id, team.id)}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    p: 1.5,
                                    borderRadius: 2,
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
                                        {team.name}
                                      </Typography>
                                    </Stack>

                                    {isAssigned && (
                                      <>
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
                                            {getEventsForTeamAndSessionType(sessionType.id, team.id).map((evt) => (
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
                                      </>
                                    )}
                                  </Box>
                                </Paper>
                              )
                            })}
                          </Box>
                        )}
                      </Box>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Paper>
            )
          })}

          {activeSessionTypes.length === 0 && (
            <Box
              sx={{
                py: 8,
                textAlign: 'center',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 3,
                bgcolor: 'grey.50',
              }}
            >
              <Tag size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                No active sessions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Create and enable session types under "Session Types" to customize booking sessions.
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
    </Box>
  )
}

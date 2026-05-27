import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import { Tag } from 'lucide-react'
import type { BookingPage, Team } from '@/types'
import { useSessionTypes } from '@/hooks/queries/useSessionTypes'
import { useTeams } from '@/hooks/queries/useTeams'
import { useEvents } from '@/hooks/queries/useEvents'
import { useQueryClient } from '@tanstack/react-query'
import { bookingPageKeys } from '@/hooks/queries/useBookingPages'
import { bookingPagesApi } from '@/api/bookingPages'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { extractApiError } from '@/utils/apiError'
import { alpha } from '@mui/material/styles'
import { toTitleCase } from '@/utils/toTitleCase'
import { SessionDetailConfigPanel } from './SessionDetailConfigPanel'

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

  const [selectedSessionTypeId, setSelectedSessionTypeId] = useState<string | null>(null)

  const { data: allSessionTypes = [] } = useSessionTypes()
  const teamsResult = useTeams({ pageSize: 200 })
  const allTeams: Team[] = teamsResult.data?.teams ?? []

  // Fetch all events to display actual counts on team cards
  const { data: eventsData } = useEvents({ page: 1, pageSize: 500 })
  const allEvents = eventsData?.events ?? []

  const activeSessionTypes = allSessionTypes.filter((st) => st.isActive)
  const activeTeams = allTeams.filter((t) => t.isActive)

  // Auto-select first active session type by default when loaded
  useEffect(() => {
    if (!selectedSessionTypeId && activeSessionTypes.length > 0) {
      setSelectedSessionTypeId(activeSessionTypes[0].id)
    }
  }, [activeSessionTypes, selectedSessionTypeId])


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

  const selectedSessionType = activeSessionTypes.find((st) => st.id === selectedSessionTypeId)

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


        {errorMessage && (
          <Box sx={{ mb: 2 }}>
            <ErrorAlert message={errorMessage} />
          </Box>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ height: '52vh', minHeight: 400 }}>
          {/* Left Column: list of session types (limited width) */}
          <Box
            sx={{
              width: { xs: '100%', md: 340 },
              flexShrink: 0,
              borderRight: { md: '1px solid #E5E7EB' },
              pr: { md: 2 },
              overflowY: 'auto',
            }}
          >
            {activeSessionTypes.map((sessionType) => {
              const isSelected = selectedSessionTypeId === sessionType.id
              const isEnabled = draftCategories.has(sessionType.id)
              const draftTeamIds = draftCategories.get(sessionType.id)
              const numTeams = isEnabled && draftTeamIds ? draftTeamIds.size : 0
              const isOriginalEnabled = bookingPage.sections.some(
                (s) => s.sessionTypeId === sessionType.id
              )
              const isPendingRemoval = isOriginalEnabled && !isEnabled

              return (
                <Paper
                  key={sessionType.id}
                  variant="outlined"
                  onClick={() => setSelectedSessionTypeId(sessionType.id)}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    borderColor: isSelected
                      ? 'primary.main'
                      : isPendingRemoval
                        ? 'error.main'
                        : 'divider',
                    bgcolor: isSelected
                      ? (theme) => alpha(theme.palette.primary.main, 0.04)
                      : isPendingRemoval
                        ? (theme) => alpha(theme.palette.error.main, 0.01)
                        : 'background.paper',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      bgcolor: (theme) => isSelected 
                        ? alpha(theme.palette.primary.main, 0.06) 
                        : alpha(theme.palette.primary.main, 0.01),
                    },
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
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
                        <Tag size={16} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: isPendingRemoval
                              ? 'error.main'
                              : isEnabled
                                ? 'text.primary'
                                : 'text.secondary',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {toTitleCase(sessionType.name)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isEnabled ? `${numTeams} team${numTeams !== 1 ? 's' : ''}` : 'Disabled'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                    >
                      <Switch
                        size="small"
                        checked={isEnabled}
                        onChange={() => {
                          handleSectionToggle(sessionType.id)
                          setSelectedSessionTypeId(sessionType.id)
                        }}
                        disabled={isSaving}
                        color="primary"
                      />
                    </Box>
                  </Stack>
                </Paper>
              )
            })}

            {activeSessionTypes.length === 0 && (
              <Box
                sx={{
                  py: 4,
                  textAlign: 'center',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                }}
              >
                <Tag size={24} style={{ opacity: 0.3, marginBottom: 8 }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>
                  No active sessions
                </Typography>
              </Box>
            )}
          </Box>

          {/* Right Column: details / team configuration for selectedSessionType */}
          <Box sx={{ flexGrow: 1, overflowY: 'auto', pl: { md: 1 }, pr: { xs: 0.5, md: 1 }, pt: 0.5 }}>
            <SessionDetailConfigPanel
              selectedSessionType={selectedSessionType}
              draftCategories={draftCategories}
              bookingPage={bookingPage}
              activeTeams={activeTeams}
              isSaving={isSaving}
              getEventCount={getEventCount}
              getEventsForTeamAndSessionType={getEventsForTeamAndSessionType}
              handleTeamToggle={handleTeamToggle}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
}

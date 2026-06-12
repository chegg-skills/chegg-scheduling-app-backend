import { useState, useEffect, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import { Tag } from 'lucide-react'
import type { BookingDirectory, Team } from '@/types'
import { useEventTypes } from '@/hooks/queries/useEventTypes'
import { useTeams } from '@/hooks/queries/useTeams'
import { useEvents } from '@/hooks/queries/useEvents'
import { useQueryClient } from '@tanstack/react-query'
import { bookingDirectoryKeys } from '@/hooks/queries/useBookingDirectories'
import { bookingDirectoriesApi } from '@/api/bookingDirectories'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { extractApiError } from '@/utils/apiError'
import { alpha } from '@mui/material/styles'
import { toTitleCase } from '@/utils/toTitleCase'
import { EventTypeConfigPanel } from './EventTypeConfigPanel'

interface BookingDirectorySectionEditorProps {
  bookingDirectory: BookingDirectory
  onClose: () => void
  onSavingChange?: (saving: boolean) => void
  onDirtyChange?: (isDirty: boolean) => void
}

export function BookingDirectorySectionEditor({
  bookingDirectory,
  onClose,
  onSavingChange,
  onDirtyChange,
}: BookingDirectorySectionEditorProps) {
  const qc = useQueryClient()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Local draft state: Map of eventTypeId -> Set of teamIds
  const [draftCategories, setDraftCategories] = useState<Map<string, Set<string>>>(() => {
    const map = new Map<string, Set<string>>()
    bookingDirectory.sections.forEach((section) => {
      const teamIds = new Set(section.teams.map((t) => t.teamId))
      map.set(section.eventTypeId, teamIds)
    })
    return map
  })

  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(null)

  const { data: allEventTypes = [] } = useEventTypes()
  const teamsResult = useTeams({ pageSize: 200 })
  const allTeams: Team[] = teamsResult.data?.teams ?? []

  // Fetch all events to display actual counts on team cards
  const { data: eventsData } = useEvents({ page: 1, pageSize: 500 })

  const activeEventTypes = allEventTypes.filter((et) => et.isActive)
  const activeTeams = allTeams.filter((t) => t.isActive)

  // Auto-select first active event type by default when loaded
  useEffect(() => {
    if (!selectedEventTypeId && activeEventTypes.length > 0) {
      setSelectedEventTypeId(activeEventTypes[0].id)
    }
  }, [activeEventTypes, selectedEventTypeId])

  // Pre-compute grouped events once per eventsData change instead of filtering on every render.
  const eventsByKey = useMemo(() => {
    const allEvents = eventsData?.events ?? []
    const map = new Map<string, typeof allEvents>()
    for (const e of allEvents) {
      if (!e.isActive || !e.eventTypeId) continue
      const key = `${e.teamId}:${e.eventTypeId}`
      const bucket = map.get(key) ?? []
      bucket.push(e)
      map.set(key, bucket)
    }
    return map
  }, [eventsData])

  const getEventCount = (eventTypeId: string, teamId: string) =>
    eventsByKey.get(`${teamId}:${eventTypeId}`)?.length ?? 0

  const getEventsForTeamAndEventType = (eventTypeId: string, teamId: string) =>
    eventsByKey.get(`${teamId}:${eventTypeId}`) ?? []

  // Calculate if local draft state has changes compared to original bookingDirectory sections
  useEffect(() => {
    const origSectionsMap = new Map<string, Set<string>>()
    bookingDirectory.sections.forEach((s) => {
      origSectionsMap.set(s.eventTypeId, new Set(s.teams.map((t) => t.teamId)))
    })

    let isDirty = false

    if (draftCategories.size !== origSectionsMap.size) {
      isDirty = true
    } else {
      for (const [eventTypeId, teamIds] of draftCategories) {
        const origTeamIds = origSectionsMap.get(eventTypeId)
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
  }, [draftCategories, bookingDirectory.sections, onDirtyChange])

  useEffect(() => {
    onSavingChange?.(isSaving)
  }, [isSaving, onSavingChange])

  const handleSectionToggle = (eventTypeId: string) => {
    if (isSaving) return
    setDraftCategories((prev) => {
      const next = new Map(prev)
      if (next.has(eventTypeId)) {
        next.delete(eventTypeId)
      } else {
        next.set(eventTypeId, new Set())
      }
      return next
    })
  }

  const handleTeamToggle = (eventTypeId: string, teamId: string) => {
    if (isSaving) return
    setDraftCategories((prev) => {
      const next = new Map(prev)
      const teamIds = next.get(eventTypeId)
      if (teamIds) {
        const nextTeamIds = new Set(teamIds)
        if (nextTeamIds.has(teamId)) {
          nextTeamIds.delete(teamId)
        } else {
          nextTeamIds.add(teamId)
        }
        next.set(eventTypeId, nextTeamIds)
      }
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMessage(null)

    // Compute differences
    const sectionsToAdd: string[] = []
    draftCategories.forEach((_, eventTypeId) => {
      if (!bookingDirectory.sections.some((s) => s.eventTypeId === eventTypeId)) {
        sectionsToAdd.push(eventTypeId)
      }
    })

    const sectionsToRemove: { id: string; name: string }[] = []
    bookingDirectory.sections.forEach((section) => {
      if (!draftCategories.has(section.eventTypeId)) {
        sectionsToRemove.push({ id: section.id, name: section.eventType.name })
      }
    })

    try {
      // 1. Process sections to remove
      for (const section of sectionsToRemove) {
        await bookingDirectoriesApi.removeSection(bookingDirectory.id, section.id)
      }

      // 2. Process sections to add & their teams
      for (const eventTypeId of sectionsToAdd) {
        const response = await bookingDirectoriesApi.addSection(bookingDirectory.id, {
          eventTypeId,
        })
        const updatedDirectory = response.data.data?.bookingDirectory
        const newSection = updatedDirectory?.sections.find((s) => s.eventTypeId === eventTypeId)
        if (newSection) {
          const draftTeamIds = draftCategories.get(eventTypeId) ?? new Set()
          for (const teamId of draftTeamIds) {
            await bookingDirectoriesApi.addTeamToSection(bookingDirectory.id, newSection.id, {
              teamId,
            })
          }
        }
      }

      // 3. Process existing sections (teams to add & remove)
      for (const section of bookingDirectory.sections) {
        if (draftCategories.has(section.eventTypeId)) {
          const draftTeamIds = draftCategories.get(section.eventTypeId) ?? new Set()
          const origTeamIds = new Set(section.teams.map((t) => t.teamId))

          // Teams to add
          for (const teamId of draftTeamIds) {
            if (!origTeamIds.has(teamId)) {
              await bookingDirectoriesApi.addTeamToSection(bookingDirectory.id, section.id, {
                teamId,
              })
            }
          }

          // Teams to remove
          for (const teamId of origTeamIds) {
            if (!draftTeamIds.has(teamId)) {
              await bookingDirectoriesApi.removeTeamFromSection(
                bookingDirectory.id,
                section.id,
                teamId
              )
            }
          }
        }
      }

      // Invalidate Query Cache to update all booking directory tables and components
      await qc.invalidateQueries({ queryKey: bookingDirectoryKeys.all })

      // Successfully saved! Close the modal
      onClose()
    } catch (err) {
      setErrorMessage(extractApiError(err))
    } finally {
      setIsSaving(false)
    }
  }

  const selectedEventType = activeEventTypes.find((et) => et.id === selectedEventTypeId)

  return (
    <Box
      component="form"
      id="booking-directory-sections-form"
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

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={3}
          sx={{ height: '52vh', minHeight: 400 }}
        >
          {/* Left Column: list of event types (limited width) */}
          <Box
            sx={{
              width: { xs: '100%', md: 340 },
              flexShrink: 0,
              borderRight: { md: '1px solid #E5E7EB' },
              pr: { md: 2 },
              overflowY: 'auto',
            }}
          >
            {activeEventTypes.map((eventType) => {
              const isSelected = selectedEventTypeId === eventType.id
              const isEnabled = draftCategories.has(eventType.id)
              const draftTeamIds = draftCategories.get(eventType.id)
              const numTeams = isEnabled && draftTeamIds ? draftTeamIds.size : 0
              const isOriginalEnabled = bookingDirectory.sections.some(
                (s) => s.eventTypeId === eventType.id
              )
              const isPendingRemoval = isOriginalEnabled && !isEnabled

              return (
                <Paper
                  key={eventType.id}
                  variant="outlined"
                  onClick={() => setSelectedEventTypeId(eventType.id)}
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
                      bgcolor: (theme) =>
                        isSelected
                          ? alpha(theme.palette.primary.main, 0.06)
                          : alpha(theme.palette.primary.main, 0.01),
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="space-between"
                  >
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
                          {toTitleCase(eventType.name)}
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
                          handleSectionToggle(eventType.id)
                          setSelectedEventTypeId(eventType.id)
                        }}
                        disabled={isSaving}
                        color="primary"
                      />
                    </Box>
                  </Stack>
                </Paper>
              )
            })}

            {activeEventTypes.length === 0 && (
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
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}
                >
                  No active event types
                </Typography>
              </Box>
            )}
          </Box>

          {/* Right Column: details / team configuration for selectedEventType */}
          <Box
            sx={{ flexGrow: 1, overflowY: 'auto', pl: { md: 1 }, pr: { xs: 0.5, md: 1 }, pt: 0.5 }}
          >
            <EventTypeConfigPanel
              selectedEventType={selectedEventType}
              draftCategories={draftCategories}
              bookingDirectory={bookingDirectory}
              activeTeams={activeTeams}
              isSaving={isSaving}
              getEventCount={getEventCount}
              getEventsForTeamAndEventType={getEventsForTeamAndEventType}
              handleTeamToggle={handleTeamToggle}
            />
          </Box>
        </Stack>
      </Stack>
    </Box>
  )
}

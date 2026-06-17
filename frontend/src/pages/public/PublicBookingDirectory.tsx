import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { useEffect } from 'react'
import { usePublicBookingDirectoryBySlug } from '@/hooks/queries/usePublicBookingDirectory'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'
import { useLegacyDirectoryRedirect } from './booking-directory/useLegacyDirectoryRedirect'
import { DirectoryMessageView } from './booking-directory/DirectoryMessageView'
import { DirectoryHeader } from './booking-directory/DirectoryHeader'
import { EventListView } from './booking-directory/EventListView'
import { TeamListView } from './booking-directory/TeamListView'
import { CategoryListView } from './booking-directory/CategoryListView'

export function PublicBookingDirectory() {
  const navigate = useNavigate()
  const { directorySlug, eventTypeKey, teamSlug } = useParams<{
    directorySlug?: string
    eventTypeKey?: string
    teamSlug?: string
  }>()
  const outletCtx = useOutletContext<PublicLayoutOutletContext | null>()

  const slug = directorySlug ?? 'default'
  const { data: bookingDirectory, isLoading, error } = usePublicBookingDirectoryBySlug(slug)

  useLegacyDirectoryRedirect(bookingDirectory)

  useEffect(() => {
    outletCtx?.setFramed(true)
  }, [outletCtx])

  // Find the selected section and team from path params
  const selectedSection = eventTypeKey
    ? bookingDirectory?.sections.find((s) => s.eventType.key === eventTypeKey)
    : undefined

  const selectedTeamEntry = teamSlug
    ? selectedSection?.teams.find((t) => t.team.publicBookingSlug === teamSlug)
    : undefined

  // Redirect directly to the event booking page if the team slug is provided but the team only has 1 event.
  useEffect(() => {
    if (selectedTeamEntry && selectedTeamEntry.events.length === 1) {
      const singleEvent = selectedTeamEntry.events[0]
      navigate(`/book/event/${singleEvent.publicBookingSlug ?? singleEvent.id}`, { replace: true })
    }
  }, [selectedTeamEntry, navigate])

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error || !bookingDirectory) {
    return (
      <DirectoryMessageView
        title="No sessions available"
        description="There are no booking sessions configured at this time. Please check back later or contact your administrator."
      />
    )
  }

  // Filter out any categories/sections that do not have participating teams to prevent dead-end navigation
  const visibleSections = bookingDirectory.sections.filter((s) => s.teams.length > 0)

  // A slug in the URL that doesn't match any known entity is a 404, not a silent fallback
  if (eventTypeKey && !selectedSection) {
    return (
      <DirectoryMessageView
        title="Session category not found"
        description={
          <>
            The session category <strong>{eventTypeKey}</strong> doesn't exist or is no longer
            available.
          </>
        }
        backLink={{ label: 'Back to all session categories', to: '/book/sessions' }}
      />
    )
  }

  if (teamSlug && !selectedTeamEntry) {
    return (
      <DirectoryMessageView
        title="Team not found"
        description={
          <>
            The team <strong>{teamSlug}</strong> doesn't exist under this session category or is no
            longer available.
          </>
        }
        backLink={{ label: 'Back to teams', to: `/book/sessions/${eventTypeKey}` }}
      />
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      <DirectoryHeader description={bookingDirectory.description} />

      {/* Content */}
      <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>
        {selectedSection && selectedTeamEntry ? (
          <EventListView
            eventTypeKey={eventTypeKey}
            selectedSection={selectedSection}
            selectedTeamEntry={selectedTeamEntry}
          />
        ) : selectedSection ? (
          <TeamListView eventTypeKey={eventTypeKey} selectedSection={selectedSection} />
        ) : (
          <CategoryListView visibleSections={visibleSections} />
        )}
      </Box>
    </Box>
  )
}

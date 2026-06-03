import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import { useNavigate, useParams, useOutletContext, useSearchParams } from 'react-router-dom'
import { Users, BookOpen, Tag, ChevronLeft, Calendar, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { usePublicBookingDirectoryBySlug } from '@/hooks/queries/usePublicBookingDirectory'
import LogoOrange from '@/assets/Color=Orange.svg'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'
import { toTitleCase } from '@/utils/toTitleCase'
import { EventCard } from '@/components/public/booking/EventCard'

export function PublicBookingDirectory() {
  const navigate = useNavigate()
  const { directorySlug, sessionTypeSlug, teamSlug } = useParams<{
    directorySlug?: string
    sessionTypeSlug?: string
    teamSlug?: string
  }>()
  const outletCtx = useOutletContext<PublicLayoutOutletContext | null>()

  const slug = directorySlug ?? 'default'
  const { data: bookingDirectory, isLoading, error } = usePublicBookingDirectoryBySlug(slug)

  // Legacy redirect: old query-param URLs (?category=slug&team=slug or ?category=UUID)
  // are redirected to the path-based equivalent /book/sessions/:sessionTypeSlug/:teamSlug
  const [searchParams] = useSearchParams()
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  useEffect(() => {
    const categoryParam = searchParams.get('category')
    const teamParam = searchParams.get('team')
    if (!categoryParam && !teamParam) return
    if (!bookingDirectory) return

    const resolveCategory = () => {
      if (!categoryParam) return null
      if (!UUID_RE.test(categoryParam)) return categoryParam
      return (
        bookingDirectory.sections.find((s) => s.sessionType.id === categoryParam)?.sessionType
          .slug ?? null
      )
    }
    const resolvedCategory = resolveCategory()
    if (!resolvedCategory) {
      navigate('/book/sessions', { replace: true })
      return
    }

    const resolveTeam = () => {
      if (!teamParam) return null
      if (!UUID_RE.test(teamParam)) return teamParam
      const section = bookingDirectory.sections.find((s) => s.sessionType.slug === resolvedCategory)
      return section?.teams.find((t) => t.team.id === teamParam)?.team.publicBookingSlug ?? null
    }
    const resolvedTeam = resolveTeam()

    const dest = resolvedTeam
      ? `/book/sessions/${resolvedCategory}/${resolvedTeam}`
      : `/book/sessions/${resolvedCategory}`
    navigate(dest, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingDirectory])

  useEffect(() => {
    outletCtx?.setFramed(true)
  }, [outletCtx])

  // Find the selected section and team from path params
  const selectedSection = sessionTypeSlug
    ? bookingDirectory?.sections.find((s) => s.sessionType.slug === sessionTypeSlug)
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

  function handleBook(eventSlug: string) {
    navigate(`/book/event/${eventSlug}`)
  }

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (error || !bookingDirectory) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          textAlign: 'center',
          px: 4,
        }}
      >
        <Box
          component="img"
          src={LogoOrange}
          alt="Chegg Skills"
          sx={{ height: 32, mb: 3, opacity: 0.5 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          No sessions available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          There are no booking sessions configured at this time. Please check back later or contact
          your administrator.
        </Typography>
      </Box>
    )
  }

  // Filter out any categories/sections that do not have participating teams to prevent dead-end navigation
  const visibleSections = bookingDirectory.sections.filter((s) => s.teams.length > 0)

  // A slug in the URL that doesn't match any known entity is a 404, not a silent fallback
  if (sessionTypeSlug && !selectedSection) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          textAlign: 'center',
          px: 4,
        }}
      >
        <Box
          component="img"
          src={LogoOrange}
          alt="Chegg Skills"
          sx={{ height: 32, mb: 3, opacity: 0.5 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Session category not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The session category <strong>{sessionTypeSlug}</strong> doesn't exist or is no longer
          available.
        </Typography>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate('/book/sessions')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate('/book/sessions')
          }}
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ChevronLeft size={16} style={{ marginRight: 6 }} />
          Back to all session categories
        </Box>
      </Box>
    )
  }

  if (teamSlug && !selectedTeamEntry) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          textAlign: 'center',
          px: 4,
        }}
      >
        <Box
          component="img"
          src={LogoOrange}
          alt="Chegg Skills"
          sx={{ height: 32, mb: 3, opacity: 0.5 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Team not found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          The team <strong>{teamSlug}</strong> doesn't exist under this session category or is no
          longer available.
        </Typography>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/book/sessions/${sessionTypeSlug}`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') navigate(`/book/sessions/${sessionTypeSlug}`)
          }}
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <ChevronLeft size={16} style={{ marginRight: 6 }} />
          Back to teams
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 4 },
          pt: { xs: 3, sm: 5 },
          pb: { xs: 2, sm: 4 },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'accent.peach',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: 0,
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(232,113,0,0.06) 0%, rgba(255,255,255,0) 70%)',
            borderRadius: '50%',
          },
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 2, sm: 3 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mb: 1.5 }}
        >
          <Box
            component="img"
            src={LogoOrange}
            alt="Chegg Skills"
            sx={{ height: 32, flexShrink: 0 }}
          />
          {bookingDirectory.description && (
            <>
              <Divider
                orientation="vertical"
                flexItem
                sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontWeight: 500, lineHeight: 1.5, maxWidth: '640px' }}
              >
                {bookingDirectory.description}
              </Typography>
            </>
          )}
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 4 } }}>
        {selectedSection && selectedTeamEntry ? (
          /* Step 3: Event List View */
          <Box>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/book/sessions/${sessionTypeSlug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  navigate(`/book/sessions/${sessionTypeSlug}`)
              }}
              sx={{
                mb: 4,
                display: 'inline-flex',
                alignItems: 'center',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <ChevronLeft size={16} style={{ marginRight: 6 }} />
              Back to teams
            </Box>

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {toTitleCase(selectedSection.sessionType.name)} —{' '}
                {toTitleCase(selectedTeamEntry.team.name)}
              </Typography>
              <Chip
                label={`${selectedTeamEntry.events.length} event${selectedTeamEntry.events.length !== 1 ? 's' : ''} available`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: 'accent.peach',
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'primary.light',
                }}
              />
            </Stack>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Select an Event
            </Typography>

            {selectedTeamEntry.events.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 6,
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                  borderStyle: 'dashed',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  maxWidth: '540px',
                  mx: 'auto',
                  mt: 2,
                }}
              >
                <Calendar size={40} style={{ opacity: 0.3, marginBottom: 16, color: '#E87100' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  No sessions scheduled
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1.5, lineHeight: 1.5 }}
                >
                  There are currently no active booking events scheduled for the{' '}
                  <strong>{toTitleCase(selectedTeamEntry.team.name)}</strong> under this category.
                  Please check back later or contact your coordinator.
                </Typography>
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 2, sm: 3 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1fr 1fr',
                  },
                }}
              >
                {selectedTeamEntry.events.map((event) => (
                  <EventCard key={event.id} event={event} onBook={handleBook} />
                ))}
              </Box>
            )}
          </Box>
        ) : selectedSection ? (
          /* Step 2: Team List View */
          <Box>
            <Box
              role="button"
              tabIndex={0}
              onClick={() => navigate('/book/sessions')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/book/sessions')
              }}
              sx={{
                mb: 4,
                display: 'inline-flex',
                alignItems: 'center',
                color: 'primary.main',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                userSelect: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              <ChevronLeft size={16} style={{ marginRight: 6 }} />
              Back to all session categories
            </Box>

            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {toTitleCase(selectedSection.sessionType.name)}
              </Typography>
              <Chip
                label={`${selectedSection.teams.length} discipline${selectedSection.teams.length !== 1 ? 's' : ''} available`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: 'accent.peach',
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'primary.light',
                }}
              />
            </Stack>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Select a discipline or team
            </Typography>

            {selectedSection.teams.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 6,
                  textAlign: 'center',
                  bgcolor: 'grey.50',
                  borderStyle: 'dashed',
                  borderColor: 'divider',
                  borderRadius: 1.5,
                  maxWidth: '540px',
                  mx: 'auto',
                  mt: 2,
                }}
              >
                <Users size={40} style={{ opacity: 0.3, marginBottom: 16, color: '#E87100' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  No participating teams available
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1.5, lineHeight: 1.5 }}
                >
                  There are currently no active disciplines or teams configured to host bookings
                  under this category. Please check back later or contact your coordinator.
                </Typography>
              </Paper>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gap: { xs: 2, sm: 3 },
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: '1fr 1fr',
                  },
                }}
              >
                {selectedSection.teams.map((entry) => (
                  <Paper
                    key={entry.team.id}
                    variant="outlined"
                    onClick={() => {
                      if (entry.events.length === 1) {
                        handleBook(entry.events[0].publicBookingSlug ?? entry.events[0].id)
                      } else {
                        navigate(
                          `/book/sessions/${sessionTypeSlug}/${entry.team.publicBookingSlug ?? entry.team.id}`
                        )
                      }
                    }}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      bgcolor: 'background.paper',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 12px 24px -10px rgba(232, 113, 0, 0.12)',
                        transform: 'translateY(-4px)',
                        '& .arrow-icon': {
                          bgcolor: 'primary.main',
                          color: 'white',
                          transform: 'translateX(4px)',
                        },
                        '& .team-icon': {
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          boxShadow: '0 2px 8px rgba(232, 113, 0, 0.08)',
                        },
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2.5}
                      alignItems="center"
                      sx={{ flexGrow: 1, minWidth: 0 }}
                    >
                      <Box
                        className="team-icon"
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          color: 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <Users size={24} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: 'text.primary',
                            mb: 0.5,
                            lineHeight: 1.3,
                            textTransform: 'none',
                          }}
                        >
                          {toTitleCase(entry.team.name)}
                        </Typography>
                        {entry.team.description ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontWeight: 500,
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              mb: 1.5,
                            }}
                          >
                            {entry.team.description}
                          </Typography>
                        ) : (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1.5 }}
                          >
                            Click to view available sessions
                          </Typography>
                        )}
                        <Chip
                          icon={<BookOpen size={12} />}
                          label={`${entry.events.length} session${entry.events.length !== 1 ? 's' : ''} available`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      </Box>
                    </Stack>
                    <Box
                      className="arrow-icon"
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        ml: 2,
                      }}
                    >
                      <ArrowRight size={16} />
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Box>
        ) : visibleSections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Tag size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              No sessions configured yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sessions will appear here once your administrator configures this booking directory.
            </Typography>
          </Box>
        ) : (
          <Box>
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
            >
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
                Select a Session Category
              </Typography>
              <Chip
                label={`${visibleSections.length} available`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  bgcolor: 'accent.peach',
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'primary.light',
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
              Choose a category below to view participating teams and book your session.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: { xs: 2, sm: 3 },
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '1fr 1fr',
                },
              }}
            >
              {visibleSections.map((section) => {
                const teamCount = section.teams.length
                const sessionType = section.sessionType

                return (
                  <Paper
                    key={sessionType.id}
                    variant="outlined"
                    onClick={() => navigate(`/book/sessions/${section.sessionType.slug}`)}
                    sx={{
                      p: { xs: 2, sm: 3 },
                      borderRadius: 1.5,
                      cursor: 'pointer',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      bgcolor: 'background.paper',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 12px 24px -10px rgba(232, 113, 0, 0.12)',
                        transform: 'translateY(-4px)',
                        '& .arrow-icon': {
                          bgcolor: 'primary.main',
                          color: 'white',
                          transform: 'translateX(4px)',
                        },
                        '& .category-icon': {
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          boxShadow: '0 2px 8px rgba(232, 113, 0, 0.08)',
                        },
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2.5}
                      alignItems="center"
                      sx={{ flexGrow: 1, minWidth: 0 }}
                    >
                      <Box
                        className="category-icon"
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          color: 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                          transition: 'all 0.25s ease',
                        }}
                      >
                        <Tag size={24} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: 'text.primary',
                            mb: 0.5,
                            lineHeight: 1.3,
                            textTransform: 'none',
                          }}
                        >
                          {toTitleCase(sessionType.name)}
                        </Typography>
                        {sessionType.description ? (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontWeight: 500,
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              mb: 1.5,
                            }}
                          >
                            {sessionType.description}
                          </Typography>
                        ) : (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 1.5 }}
                          >
                            Click to view details and teams
                          </Typography>
                        )}
                        <Chip
                          icon={<Users size={12} />}
                          label={`${teamCount} ${teamCount === 1 ? 'discipline' : 'disciplines'} available`}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            bgcolor: 'secondary.light',
                            color: 'secondary.main',
                            '& .MuiChip-icon': { color: 'inherit' },
                          }}
                        />
                      </Box>
                    </Stack>
                    <Box
                      className="arrow-icon"
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
                        color: 'text.secondary',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                        ml: 2,
                      }}
                    >
                      <ArrowRight size={16} />
                    </Box>
                  </Paper>
                )
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

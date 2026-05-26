import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Button from '@mui/material/Button'
import { useNavigate, useParams, useOutletContext, useSearchParams } from 'react-router-dom'
import { Clock, MapPin, Users, ArrowRight, BookOpen, Tag, ChevronLeft } from 'lucide-react'
import { useEffect } from 'react'
import { usePublicBookingPageBySlug } from '@/hooks/queries/usePublicBookingPage'
import type { PublicEventSummary, PublicBookingPageSection } from '@/types'
import { INTERACTION_TYPE_OPTIONS } from '@/constants/interactionTypes'
import LogoOrange from '@/assets/Color=Orange.svg'
import type { PublicLayoutOutletContext } from '@/components/layout/PublicLayout'

const INTERACTION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  INTERACTION_TYPE_OPTIONS.map((o) => [o.key, o.label])
)

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

interface EventCardProps {
  event: PublicEventSummary
  onBook: (slug: string) => void
}

function EventCard({ event, onBook }: EventCardProps) {
  return (
    <Paper
      variant="outlined"
      onClick={() => event.publicBookingSlug && onBook(event.publicBookingSlug)}
      sx={{
        p: 2.5,
        borderRadius: 2,
        cursor: event.publicBookingSlug ? 'pointer' : 'default',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: 'background.paper',
        borderColor: 'divider',
        '&:hover': event.publicBookingSlug
          ? {
              borderColor: 'primary.main',
              boxShadow: '0 8px 24px rgba(232, 113, 0, 0.06)',
              transform: 'translateY(-2px)',
            }
          : {},
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        <Box sx={{ flex: 1, pr: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
            {event.name}
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ gap: 1 }}>
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
              <Clock size={14} />
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {formatDuration(event.durationSeconds)}
              </Typography>
            </Stack>
            {event.locationType && (
              <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: 'text.secondary' }}>
                <MapPin size={14} />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  {event.locationType === 'VIRTUAL' ? 'Virtual' : event.locationType === 'IN_PERSON' ? 'In Person' : 'Custom'}
                </Typography>
              </Stack>
            )}
            {event.interactionType && (
              <Chip
                label={INTERACTION_TYPE_LABELS[event.interactionType] ?? event.interactionType}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: 'accent.peach',
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'primary.light',
                }}
              />
            )}
          </Stack>
        </Box>
        {event.publicBookingSlug && (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: 'primary.light',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s ease',
              '.MuiPaper-root:hover &': {
                bgcolor: 'primary.main',
                color: 'white',
              },
            }}
          >
            <ArrowRight size={16} />
          </Box>
        )}
      </Stack>
    </Paper>
  )
}

interface TeamGroupProps {
  teamName: string
  events: PublicEventSummary[]
  onBook: (slug: string) => void
}

function TeamGroup({ teamName, events, onBook }: TeamGroupProps) {
  return (
    <Box sx={{ pl: { xs: 0, sm: 2 } }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1,
            bgcolor: 'secondary.light',
            color: 'secondary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Users size={14} />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {teamName}
        </Typography>
        <Chip
          label={`${events.length} session${events.length !== 1 ? 's' : ''}`}
          size="small"
          sx={{
            height: 20,
            fontSize: '0.7rem',
            fontWeight: 600,
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        />
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: {
            xs: '1fr',
            md: '1fr 1fr',
          },
        }}
      >
        {events.map((event) => (
          <EventCard key={event.id} event={event} onBook={onBook} />
        ))}
      </Box>
    </Box>
  )
}

interface SectionCardProps {
  section: PublicBookingPageSection
  onBook: (slug: string) => void
}

function SectionCard({ section, onBook }: SectionCardProps) {
  return (
    <Box sx={{ py: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.light',
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(232, 113, 0, 0.08)',
          }}
        >
          <Tag size={20} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.3px' }}>
            {section.sessionType.name}
          </Typography>
          {section.sessionType.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              {section.sessionType.description}
            </Typography>
          )}
        </Box>
      </Stack>

      <Stack spacing={4}>
        {section.teams.map(({ team, events }) => (
          <TeamGroup
            key={team.id}
            teamName={team.name}
            events={events}
            onBook={onBook}
          />
        ))}
      </Stack>
    </Box>
  )
}

export function PublicBookingPageDirectory() {
  const navigate = useNavigate()
  const { pageSlug } = useParams<{ pageSlug?: string }>()
  const outletCtx = useOutletContext<PublicLayoutOutletContext | null>()

  const slug = pageSlug ?? 'default'
  const { data: bookingPage, isLoading, error } = usePublicBookingPageBySlug(slug)

  // URL query state to track selected session type ID and team ID for the progressive drill-down views
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedSessionTypeId = searchParams.get('category')
  const selectedTeamId = searchParams.get('team')

  const setSelectedSessionTypeId = (id: string | null) => {
    setSearchParams(
      (prev) => {
        if (id) {
          prev.set('category', id)
        } else {
          prev.delete('category')
          prev.delete('team') // Clear team selection when returning to categories
        }
        return prev
      },
      { replace: false }
    )
  }

  const setSelectedTeamId = (id: string | null) => {
    setSearchParams(
      (prev) => {
        if (id) {
          prev.set('team', id)
        } else {
          prev.delete('team')
        }
        return prev
      },
      { replace: false }
    )
  }

  useEffect(() => {
    outletCtx?.setFramed(true)
  }, [outletCtx])

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

  if (error || !bookingPage) {
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
          alt="Chegg"
          sx={{ height: 32, mb: 3, opacity: 0.5 }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          No sessions available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          There are no booking sessions configured at this time. Please check back later or contact your administrator.
        </Typography>
      </Box>
    )
  }

  // Filter out any categories/sections that do not have participating teams to prevent dead-end navigation
  const visibleSections = bookingPage.sections.filter((s) => s.teams.length > 0)

  // Find the selected section if any
  const selectedSection = bookingPage.sections.find(
    (s) => s.sessionType.id === selectedSessionTypeId
  )

  // Find the selected team entry if any
  const selectedTeamEntry = selectedSection?.teams.find(
    (t) => t.team.id === selectedTeamId
  )

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          px: { xs: 3, sm: 4 },
          pt: { xs: 4, sm: 5 },
          pb: { xs: 3, sm: 4 },
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
          <Box component="img" src={LogoOrange} alt="Chegg" sx={{ height: 32, flexShrink: 0 }} />
          <Divider
            orientation="vertical"
            flexItem
            sx={{ mx: 1, display: { xs: 'none', sm: 'block' } }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: 'text.primary',
                lineHeight: 1.2,
              }}
            >
              {bookingPage.name}
            </Typography>
            {bookingPage.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, fontWeight: 500, lineHeight: 1.5, maxWidth: '640px' }}
              >
                {bookingPage.description}
              </Typography>
            )}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', gap: 0.75 }}>
          <Chip
            icon={<BookOpen size={13} style={{ color: '#E87100' }} />}
            label={`${visibleSections.length} Session Categor${visibleSections.length !== 1 ? 'ies' : 'y'}`}
            size="small"
            sx={{
              height: 24,
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: 'background.paper',
              borderColor: 'divider',
              border: '1px solid',
            }}
          />
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ px: { xs: 3, sm: 4 }, py: 4 }}>
        {visibleSections.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <Tag size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              No sessions configured yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Sessions will appear here once your administrator configures this booking page.
            </Typography>
          </Box>
        ) : selectedSection && selectedTeamEntry ? (
          /* Step 3: Event List View */
          <Box>
            <Button
              onClick={() => setSelectedTeamId(null)}
              sx={{
                mb: 4,
                display: 'inline-flex',
                alignItems: 'center',
                color: 'primary.main',
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.875rem',
                p: 0,
                minWidth: 'auto',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              <ChevronLeft size={16} style={{ marginRight: 6 }} />
              Back to teams
            </Button>

            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
              Select an Event
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
              Choose an event below to book your spot with the <strong>{selectedTeamEntry.team.name}</strong>.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 3,
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
          </Box>
        ) : selectedSection ? (
          /* Step 2: Team List View */
          <Box>
            <Button
              onClick={() => setSelectedSessionTypeId(null)}
              sx={{
                mb: 4,
                display: 'inline-flex',
                alignItems: 'center',
                color: 'primary.main',
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '0.875rem',
                p: 0,
                minWidth: 'auto',
                bgcolor: 'transparent',
                '&:hover': {
                  bgcolor: 'transparent',
                  textDecoration: 'underline',
                },
              }}
            >
              <ChevronLeft size={16} style={{ marginRight: 6 }} />
              Back to all session categories
            </Button>

            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
              Select a discipline or team
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
              Select from the participating groups for <strong>{selectedSection.sessionType.name}</strong>.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 3,
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
                  onClick={() => setSelectedTeamId(entry.team.id)}
                  sx={{
                    p: 3,
                    borderRadius: 3,
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
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: 'secondary.light',
                        color: 'secondary.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(58, 44, 65, 0.08)',
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
                        {entry.team.name}
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
          </Box>
        ) : (
          /* Step 1: Category List View */
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
              Select a Session Category
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 500 }}>
              Choose a category below to view participating teams and book your session.
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 3,
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
                    onClick={() => setSelectedSessionTypeId(section.sessionType.id)}
                    sx={{
                      p: 3,
                      borderRadius: 3,
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
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: 'primary.light',
                          color: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(232, 113, 0, 0.08)',
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
                          {sessionType.name}
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

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import { alpha } from '@mui/material/styles'
import { Award, ChevronRight } from 'lucide-react'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { toTitleCase } from '@/utils/toTitleCase'
import type { PublicEventSummary } from '@/types'

interface EventStepProps {
  events: PublicEventSummary[]
  loading: boolean
  error?: unknown
  emptyMessage?: string
  selectedEventId: string | null
  onSelect: (eventId: string) => void
}

export function EventStep({
  events,
  loading,
  error,
  emptyMessage = 'No events are available right now.',
  selectedEventId,
  onSelect,
}: EventStepProps) {
  if (loading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load events." />
  if (events.length === 0) {
    return <Typography color="text.secondary">{emptyMessage}</Typography>
  }

  return (
    <Box
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: '1fr 1fr',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
        },
        gap: 1.5,
        p: 1,
      }}
    >
      {events.map((event) => (
        <Card
          key={event.id}
          variant="outlined"
          sx={{
            borderColor: selectedEventId === event.id ? 'primary.main' : 'divider',
            borderWidth: selectedEventId === event.id ? 2 : 1,
            borderRadius: 1,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            bgcolor:
              selectedEventId === event.id
                ? (theme) => alpha(theme.palette.primary.main, 0.03)
                : 'background.paper',
            '&:hover': {
              borderColor: 'primary.main',
              transform: 'translateY(-4px)',
              boxShadow: '0 12px 24px -8px rgba(0,0,0,0.1)',
            },
          }}
        >
          <CardActionArea onClick={() => onSelect(event.id)} sx={{ height: '100%' }}>
            <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box
                sx={{
                  mb: 2,
                  p: 1,
                  width: 'fit-content',
                  borderRadius: 1,
                  bgcolor:
                    selectedEventId === event.id
                      ? 'primary.main'
                      : (theme) => alpha(theme.palette.secondary.main, 0.08),
                  color: selectedEventId === event.id ? 'white' : 'secondary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                <Award size={20} />
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{ mb: 0.5, letterSpacing: -0.3, lineHeight: 1.2 }}
                >
                  {toTitleCase(event.name)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <span>{Math.floor(event.durationSeconds / 60)}m</span>
                  <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'grey.300' }} />
                  <span style={{ textTransform: 'capitalize' }}>
                    {event.locationType.toLowerCase()}
                  </span>
                </Typography>
              </Box>

              <Box
                sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <Typography
                  variant="caption"
                  fontWeight={800}
                  color="primary.main"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    fontSize: '0.75rem',
                    letterSpacing: 0.5,
                  }}
                >
                  SELECT <ChevronRight size={14} />
                </Typography>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  )
}

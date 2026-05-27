import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import { Clock, MapPin, ArrowRight } from 'lucide-react'
import type { PublicEventSummary } from '@/types'
import { INTERACTION_TYPE_OPTIONS } from '@/constants/interactionTypes'
import { toTitleCase } from '@/utils/toTitleCase'

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

export function EventCard({ event, onBook }: EventCardProps) {
  return (
    <Paper
      variant="outlined"
      onClick={() => event.publicBookingSlug && onBook(event.publicBookingSlug)}
      sx={{
        p: 2.5,
        borderRadius: 1.5,
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
            {toTitleCase(event.name)}
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

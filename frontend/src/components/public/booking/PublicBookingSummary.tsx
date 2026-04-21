import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import { alpha } from '@mui/material/styles'
import { Calendar, Clock, User } from 'lucide-react'
import type { PublicEventSummary, PublicTeamSummary, PublicCoachSummary, PublicHostInfo } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'

interface PublicBookingSummaryProps {
  teamDetails?: PublicTeamSummary | null
  eventDetails?: PublicEventSummary | null
  coachDetails?: PublicHostInfo | PublicCoachSummary | null
  selectedDate: Date | null
  selectedSlot: string | null
  title?: string
  variant?: 'default' | 'current'
  compact?: boolean
}

export function PublicBookingSummary({
  teamDetails,
  eventDetails,
  coachDetails,
  selectedDate,
  selectedSlot,
  title = 'Your selection',
  variant = 'default',
  compact = false,
}: PublicBookingSummaryProps) {
  const hasSelection = teamDetails || eventDetails || selectedDate || selectedSlot || coachDetails

  if (!hasSelection) return null

  const formatSlot = (slot: string) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(slot))
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const displayTeam = teamDetails || eventDetails?.team

  return (
    <Box
      sx={{
        mt: compact ? 0.5 : 2,
        ...(variant === 'current' && {
          p: compact ? 1.5 : 2,
          borderRadius: 1,
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.04),
          border: '1px solid',
          borderColor: (theme) => alpha(theme.palette.secondary.main, 0.1),
        }),
      }}
    >
      <Typography
        variant="overline"
        color={variant === 'current' ? 'secondary.main' : 'text.secondary'}
        fontWeight={800}
        sx={{
          display: 'block',
          mb: compact ? 0.5 : 1,
          letterSpacing: 1.2,
          fontSize: compact ? '0.6rem' : '0.7rem',
        }}
      >
        {title}
      </Typography>

      <Stack
        direction={compact ? 'row' : 'column'}
        spacing={compact ? 2 : 1.5}
        sx={{ flexWrap: 'wrap' }}
      >
        {displayTeam && (
          <Box sx={{ minWidth: 0 }}>
            {!compact && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ display: 'block', mb: 0.5 }}
              >
                Team
              </Typography>
            )}
            <Typography
              variant="body2"
              fontWeight={800}
              color="text.primary"
              sx={{
                fontSize: compact ? '0.75rem' : '0.875rem',
              }}
            >
              {toTitleCase(displayTeam.name)}
            </Typography>
          </Box>
        )}

        {eventDetails && (
          <Box sx={{ minWidth: 0 }}>
            {!compact && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}
              >
                <Calendar size={14} color={variant === 'current' ? '#3A2C41' : '#E87100'} /> Session
              </Typography>
            )}
            <Typography
              variant="body2"
              fontWeight={800}
              color="text.primary"
              sx={{
                fontSize: compact ? '0.75rem' : '0.875rem',
                whiteSpace: compact ? 'nowrap' : 'normal',
                overflow: compact ? 'hidden' : 'visible',
                textOverflow: compact ? 'ellipsis' : 'clip',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {compact && (
                <Calendar size={12} color={variant === 'current' ? '#3A2C41' : '#E87100'} />
              )}
              {toTitleCase(eventDetails.name)}
            </Typography>
          </Box>
        )}

        {selectedDate && (
          <Box>
            {!compact && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}
              >
                <Calendar size={14} color={variant === 'current' ? '#3A2C41' : '#E87100'} /> Date
              </Typography>
            )}
            <Typography
              variant="body2"
              fontWeight={700}
              color="text.primary"
              sx={{
                fontSize: compact ? '0.75rem' : '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {compact && <Clock size={12} color={variant === 'current' ? '#3A2C41' : '#E87100'} />}
              {formatDate(selectedDate)}
            </Typography>
          </Box>
        )}

        {selectedSlot && (
          <Box>
            {!compact && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}
              >
                <Clock size={14} color={variant === 'current' ? '#3A2C41' : '#E87100'} /> Time
              </Typography>
            )}
            <Typography
              variant="body2"
              fontWeight={700}
              color="text.primary"
              sx={{
                fontSize: compact ? '0.75rem' : '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              {compact && !selectedDate && (
                <Clock size={12} color={variant === 'current' ? '#3A2C41' : '#E87100'} />
              )}
              {formatSlot(selectedSlot)}
            </Typography>
          </Box>
        )}

        {/* Host Information */}
        {coachDetails && (
          <Box>
            {!compact && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}
              >
                <User size={14} color={variant === 'current' ? '#3A2C41' : '#E87100'} /> Host
              </Typography>
            )}
            <Typography
              variant="body2"
              fontWeight={700}
              color="text.primary"
              sx={{ fontSize: compact ? '0.75rem' : '0.875rem' }}
            >
              {coachDetails.firstName} {coachDetails.lastName}
            </Typography>
          </Box>
        )}
      </Stack>

      {variant !== 'current' && !compact && <Divider sx={{ mt: 2, opacity: 0.6 }} />}
    </Box>
  )
}

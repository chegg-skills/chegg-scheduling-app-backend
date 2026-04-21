import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { alpha, Theme } from '@mui/material/styles'
import { Award, Calendar, Clock, User, Users } from 'lucide-react'
import type { PublicEventSummary, PublicTeamSummary, PublicCoachSummary, PublicHostInfo } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'
import { SummaryDetail } from './SummaryDetail'

interface PublicBookingSummaryProps {
  teamDetails?: PublicTeamSummary | null
  eventDetails?: PublicEventSummary | null
  coachDetails?: PublicHostInfo | PublicCoachSummary | null
  selectedDate: Date | null
  selectedSlot: string | null
  title?: string
  variant?: 'default' | 'current'
  compact?: boolean
  condensed?: boolean
}

/**
 * PublicBookingSummary serves as the sidebar orchestrator for session details.
 * It supports standard, compact, and condensed layouts.
 */
export function PublicBookingSummary({
  teamDetails,
  eventDetails,
  coachDetails,
  selectedDate,
  selectedSlot,
  title = 'Your selection',
  variant = 'default',
  compact = false,
  condensed = false,
}: PublicBookingSummaryProps) {
  const hasSelection = !!(teamDetails || eventDetails || selectedDate || selectedSlot || coachDetails)

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
  const iconColor = variant === 'current' ? '#3A2C41' : '#E87100'

  // Determine container styles based on layout mode
  const containerStyles = {
    mt: condensed ? 1 : compact ? 1 : 2,
    ...(variant === 'current' && {
      p: condensed ? 0 : compact ? 1.5 : 2, // Condensed doesn't need extra padding if in side panel
      borderRadius: 1,
      bgcolor: (theme: Theme) => alpha(theme.palette.secondary.main, 0.04),
      border: '1px solid',
      borderColor: (theme: Theme) => alpha(theme.palette.secondary.main, 0.1),
    }),
  }

  return (
    <Box sx={containerStyles}>
      <Typography
        variant="overline"
        color={variant === 'current' ? 'secondary.main' : 'text.secondary'}
        fontWeight={800}
        sx={{
          display: 'block',
          mb: condensed || compact ? 1 : 1,
          letterSpacing: 1.2,
          fontSize: condensed || compact ? '0.65rem' : '0.7rem',
        }}
      >
        {title}
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'auto auto 1fr',
          columnGap: 0.5,
          rowGap: condensed ? 1 : 1.5,
          alignItems: 'center',
        }}
      >
        {displayTeam && (
          <SummaryDetail
            icon={Users}
            label="Team"
            value={toTitleCase(displayTeam.name)}
            color={iconColor}
          />
        )}

        {eventDetails && (
          <SummaryDetail
            icon={Award}
            label="Session"
            value={toTitleCase(eventDetails.name)}
            color={iconColor}
          />
        )}

        {selectedDate && (
          <SummaryDetail
            icon={Calendar}
            label="Date"
            value={formatDate(selectedDate)}
            color={iconColor}
          />
        )}

        {selectedSlot && (
          <SummaryDetail
            icon={Clock}
            label="Time"
            value={formatSlot(selectedSlot)}
            color={iconColor}
          />
        )}

        {coachDetails && (
          <SummaryDetail
            icon={User}
            label="Host"
            value={`${coachDetails.firstName} ${coachDetails.lastName}`}
            color={iconColor}
          />
        )}
      </Box>

      {variant !== 'current' && <Divider sx={{ mt: 1.5, opacity: 0.6 }} />}
    </Box>
  )
}

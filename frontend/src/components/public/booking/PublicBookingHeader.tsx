import * as React from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import LogoOrange from '@/assets/Color=Orange.svg'
import type { BookingScope } from '@/pages/public/hooks/usePublicBookingState'
import type { PublicCoachSummary, PublicEventSummary, PublicTeamSummary } from '@/types'

interface PublicBookingHeaderProps {
  scope: BookingScope
  teamDetails?: PublicTeamSummary | null
  eventDetails?: PublicEventSummary | null
  coachDetails?: PublicCoachSummary | null
  customHeading?: string
  customSubtitle?: string
}

export function PublicBookingHeader({
  scope,
  teamDetails,
  eventDetails,
  coachDetails,
  customHeading,
  customSubtitle,
}: PublicBookingHeaderProps) {
  const heading = React.useMemo(() => {
    switch (scope) {
      case 'team':
        return teamDetails?.name ? `Book with ${teamDetails.name}` : 'Book with this team'
      case 'event':
        return eventDetails?.name ? `Book ${eventDetails.name}` : 'Book this session'
      case 'coach':
        return coachDetails
          ? `Book with ${coachDetails.firstName} ${coachDetails.lastName}`
          : 'Book with this coach'
      case 'directory':
      default:
        return 'Book a Session'
    }
  }, [coachDetails, eventDetails?.name, scope, teamDetails?.name])

  const subtitle = React.useMemo(() => {
    switch (scope) {
      case 'team':
        return 'Choose an event from this team and pick a convenient time.'
      case 'event':
        return 'Select a time slot to book this event directly.'
      case 'coach':
        return 'Choose an event offered by this coach and book a time directly with them.'
      case 'directory':
      default:
        return 'Find the perfect time to connect with our experts.'
    }
  }, [scope])

  return (
    <Box sx={{ mb: 3 }}>
      {/* Row 1: Brand Banner */}
      <Box
        sx={{
          bgcolor: (theme) => theme.palette.primary.light,
          py: { xs: 2.5, md: 3, lg: 4 }, // Moderate height
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          mx: { xs: -2, lg: -3 }, // Bleed out to touch edges
          mt: { xs: -1.5, md: -3, lg: -3 }, // Match parent py: 1.5
          borderBottom: '1px solid',
          borderColor: (theme) => (theme.palette as any).divider
        }}
      >
        <Box
          component="img"
          src={LogoOrange}
          alt="Chegg Skills"
          sx={{
            height: { xs: 24, md: 32, lg: 36 },
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
            margin: '0 auto'
          }}
        />
      </Box>

      {/* Row 2: Header Content */}
      <Box sx={{ mt: { xs: 2.5, md: 3 }, mb: 1.5 }}>
        <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: -0.5, lineHeight: 1.1 }}>
          {customHeading || heading}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontWeight: 500, lineHeight: 1.4 }}>
          {customSubtitle || subtitle}
        </Typography>
      </Box>
      <Divider sx={{ mb: 0 }} />
    </Box>
  )
}

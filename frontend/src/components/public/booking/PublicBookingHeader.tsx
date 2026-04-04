import { useMemo } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import type { BookingScope } from '@/pages/public/hooks/usePublicBookingState'
import type { Team, SafeUser, PublicEventSummary } from '@/types'

interface PublicBookingHeaderProps {
  scope: BookingScope
  teamDetails?: Team
  eventDetails?: PublicEventSummary | null
  coachDetails?: SafeUser
}

export function PublicBookingHeader({
  scope,
  teamDetails,
  eventDetails,
  coachDetails,
}: PublicBookingHeaderProps) {
  const heading = useMemo(() => {
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

  const subtitle = useMemo(() => {
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
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
        {heading}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  )
}

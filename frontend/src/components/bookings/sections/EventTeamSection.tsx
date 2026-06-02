import { Typography } from '@mui/material'
import { BookOpen } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingSection } from './Common'

interface EventTeamSectionProps {
  booking: Booking
}

export function EventTeamSection({ booking }: EventTeamSectionProps) {
  const sessionType = booking.event?.sessionType

  return (
    <BookingSection label="Service, Team & Session" icon={<BookOpen size={16} />}>
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
        {booking.event?.name || 'Unknown Event'}
      </Typography>
      {booking.team && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: sessionType ? 0.5 : 0 }}
        >
          <strong>Team:</strong> {booking.team.name}
        </Typography>
      )}
      {sessionType && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          <strong>Session Type:</strong> {sessionType.name}
        </Typography>
      )}
    </BookingSection>
  )
}

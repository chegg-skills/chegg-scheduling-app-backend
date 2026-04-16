import { Box, Typography } from '@mui/material'
import type { Booking } from '@/types'
import { SectionLabel } from './Common'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

interface ScheduleSectionProps {
  booking: Booking
}

export function ScheduleSection({ booking }: ScheduleSectionProps) {
  const start = new Date(booking.startTime)
  const end = new Date(booking.endTime)

  return (
    <Box>
      <SectionLabel label="Session Date & Time" />
      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
        {dateFormatter.format(start)}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <span>
          {timeFormatter.format(start)} – {timeFormatter.format(end)}
        </span>
        {booking.event?.durationSeconds && (
          <Typography
            variant="caption"
            sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600 }}
          >
            {booking.event.durationSeconds / 60} mins
          </Typography>
        )}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Timezone: {booking.timezone.replace(/_/g, ' ')}
      </Typography>
    </Box>
  )
}

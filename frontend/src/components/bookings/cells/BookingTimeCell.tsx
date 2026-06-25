import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { useTimezones } from '@/hooks/queries/useConfig'
import { formatTimezoneLabel } from '@/components/users/userSystemFieldUtils'

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

const viewerIana = Intl.DateTimeFormat().resolvedOptions().timeZone

interface BookingTimeCellProps {
  startTime: string
  endTime: string
}

export function BookingTimeCell({ startTime, endTime }: BookingTimeCellProps) {
  const { data: timezones = [] } = useTimezones()
  const start = new Date(startTime)
  const end = new Date(endTime)
  const tzLabel = formatTimezoneLabel(viewerIana, timezones)

  return (
    <Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
        {timeFormatter.format(start)} – {timeFormatter.format(end)}
      </Typography>
      {tzLabel && (
        <Typography variant="caption" color="text.secondary">
          {tzLabel}
        </Typography>
      )}
    </Box>
  )
}

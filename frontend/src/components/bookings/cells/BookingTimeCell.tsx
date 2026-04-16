import Typography from '@mui/material/Typography'

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

interface BookingTimeCellProps {
  startTime: string
  endTime: string
}

export function BookingTimeCell({ startTime, endTime }: BookingTimeCellProps) {
  const start = new Date(startTime)
  const end = new Date(endTime)

  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      {timeFormatter.format(start)} – {timeFormatter.format(end)}
    </Typography>
  )
}

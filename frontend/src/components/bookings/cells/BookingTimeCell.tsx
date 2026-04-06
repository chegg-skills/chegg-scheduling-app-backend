import Typography from '@mui/material/Typography'

interface BookingTimeCellProps {
    startTime: string
    endTime: string
}

export function BookingTimeCell({ startTime, endTime }: BookingTimeCellProps) {
    const start = new Date(startTime)
    const end = new Date(endTime)

    const formatTime = (date: Date) =>
        new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date)

    return (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {formatTime(start)} – {formatTime(end)}
        </Typography>
    )
}

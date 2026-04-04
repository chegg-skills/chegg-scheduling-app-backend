import Typography from '@mui/material/Typography'

interface BookingTimeCellProps {
    startTime: string
}

export function BookingTimeCell({ startTime }: BookingTimeCellProps) {
    const date = new Date(startTime)

    return (
        <>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
                {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
                    date
                )}
            </Typography>
        </>
    )
}

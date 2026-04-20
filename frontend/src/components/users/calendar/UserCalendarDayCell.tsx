import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { alpha, useTheme } from '@mui/material/styles'
import { format } from 'date-fns'
import { UserCalendarEvent, UserCalendarItem } from './UserCalendarItem'

interface UserCalendarDayCellProps {
    day: Date
    isCurrentMonth: boolean
    isToday: boolean
    events: UserCalendarEvent[]
    onViewBooking?: (bookingId: string) => void
}

export function UserCalendarDayCell({
    day,
    isCurrentMonth,
    isToday,
    events,
    onViewBooking,
}: UserCalendarDayCellProps) {
    const theme = useTheme()

    // Sort events by start time, then by type (Bookings first, then Availability, then Blockage)
    const sortedEvents = [...events].sort((a, b) => {
        const timeDiff = a.startTime.getTime() - b.startTime.getTime()
        if (timeDiff !== 0) return timeDiff

        const typeOrder = { BOOKING: 0, AVAILABILITY: 1, BLOCKAGE: 2 }
        return typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder]
    })

    const bookingCount = events.filter((e) => e.type === 'BOOKING').length

    return (
        <Box
            sx={{
                minHeight: { xs: 100, md: 160 },
                bgcolor: !isCurrentMonth ? alpha(theme.palette.text.disabled, 0.03) : 'background.paper',
                transition: 'all 0.2s',
                p: 1.5,
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                overflow: 'hidden',
                '&:hover': {
                    bgcolor: isCurrentMonth
                        ? alpha(theme.palette.primary.main, 0.02)
                        : alpha(theme.palette.text.disabled, 0.05),
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1.5,
                }}
            >
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: isToday ? 900 : 600,
                        color: isToday ? 'white' : !isCurrentMonth ? 'text.disabled' : 'text.primary',
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        bgcolor: isToday ? 'primary.main' : 'transparent',
                        boxShadow: isToday ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.4)}` : 'none',
                    }}
                >
                    {format(day, 'd')}
                </Typography>
                {bookingCount > 0 && (
                    <Typography
                        variant="caption"
                        sx={{
                            fontWeight: 700,
                            color: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            px: 0.8,
                            py: 0.2,
                            borderRadius: 1,
                        }}
                    >
                        {bookingCount}
                    </Typography>
                )}
            </Box>

            <Stack spacing={0.6} sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: { xs: 60, md: 120 } }}>
                {sortedEvents.slice(0, 5).map((event) => (
                    <UserCalendarItem
                        key={`${event.type}-${event.id}`}
                        event={event}
                        onClick={event.type === 'BOOKING' ? () => onViewBooking?.(event.id) : undefined}
                    />
                ))}
                {sortedEvents.length > 5 && (
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', pl: 1, fontWeight: 700, fontSize: '0.65rem' }}
                    >
                        + {sortedEvents.length - 5} more items
                    </Typography>
                )}
            </Stack>
        </Box>
    )
}

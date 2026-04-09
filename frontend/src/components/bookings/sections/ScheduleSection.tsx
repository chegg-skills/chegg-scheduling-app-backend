import { Box, Typography, Button } from '@mui/material';
import type { Booking } from '@/types';
import { SectionLabel } from './Common';

interface ScheduleSectionProps {
    booking: Booking;
}

export function ScheduleSection({ booking }: ScheduleSectionProps) {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    const formatTime = (date: Date) =>
        new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date);

    return (
        <Box>
            <SectionLabel label='Session Date & Time' />
            <Typography
                variant='body2'
                sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
            >
                {new Intl.DateTimeFormat('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                }).format(start)}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{formatTime(start)} – {formatTime(end)}</span>
                {booking.event?.durationSeconds && (
                    <Typography variant='caption' sx={{ bgcolor: 'action.hover', px: 1, py: 0.25, borderRadius: 1, fontWeight: 600 }}>
                        {booking.event.durationSeconds / 60} mins
                    </Typography>
                )}
            </Typography>
            <Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
                Timezone: {booking.timezone.replace(/_/g, ' ')}
            </Typography>

            <Box sx={{ mt: 3 }}>
                <Button
                    variant="outlined"
                    size="small"
                    component="a"
                    href={`/reschedule/${booking.id}${booking.rescheduleToken ? `?token=${booking.rescheduleToken}` : ''}`}
                    target="_blank"
                    sx={{
                        borderRadius: 2,
                        fontWeight: 700,
                        textTransform: 'none',
                        borderColor: 'divider',
                        color: 'text.secondary',
                        '&:hover': {
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            bgcolor: 'primary.lighter'
                        }
                    }}
                >
                    Reschedule Session
                </Button>
            </Box>
        </Box>
    );
}

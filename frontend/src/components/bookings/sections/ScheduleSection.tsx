import { Box, Typography, useTheme } from '@mui/material';
import type { Booking } from '@/types';
import { SectionLabel } from './Common';

interface ScheduleSectionProps {
    booking: Booking;
}

export function ScheduleSection({ booking }: ScheduleSectionProps) {
    const theme = useTheme();
    const startTime = new Date(booking.startTime);

    return (
        <Box>
            <SectionLabel label='Invitee Time Zone' />
            <Typography
                variant='body2'
                sx={{ fontWeight: 500, color: theme.palette.text.primary }}
            >
                {new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(
                    startTime,
                )}
            </Typography>
            <Typography variant='body2' sx={{ mt: 0.5 }}>
                {new Intl.DateTimeFormat('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                }).format(startTime)}
                {booking.event?.durationSeconds &&
                    ` (${booking.event.durationSeconds / 60} mins)`}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
                {booking.timezone.replace(/_/g, ' ')}
            </Typography>
        </Box>
    );
}

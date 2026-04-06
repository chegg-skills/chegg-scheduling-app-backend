import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { User } from 'lucide-react';
import type { Booking } from '@/types';
import { SectionLabel } from './Common';

interface HostSectionProps {
    booking: Booking;
    onViewHost?: (userId: string) => void;
}

export function HostSection({ booking, onViewHost }: HostSectionProps) {
    const theme = useTheme();

    return (
        <Box>
            <SectionLabel label='Meeting Host' />
            <Typography variant='body2' color='text.secondary' sx={{ mb: 1.5 }}>
                Host will attend this meeting
            </Typography>
            <Stack direction='row' spacing={1.5} alignItems='center'>
                <Avatar
                    src={booking.host?.avatarUrl ?? undefined}
                    sx={{
                        width: 36,
                        height: 36,
                        fontSize: '0.875rem',
                        bgcolor: alpha(theme.palette.secondary.main, 0.05),
                        color: theme.palette.secondary.main,
                        fontWeight: 600,
                    }}
                >
                    {booking.host ? (
                        `${booking.host.firstName[0]}${booking.host.lastName[0]}`
                    ) : (
                        <User size={18} />
                    )}
                </Avatar>
                <Box>
                    {booking.host ? (() => {
                        const host = booking.host;
                        return (
                            <Typography
                                variant='body2'
                                onClick={() => onViewHost?.(host.id)}
                                sx={{
                                    fontWeight: 600,
                                    color: theme.palette.text.primary,
                                    textDecoration: 'none',
                                    cursor: onViewHost ? 'pointer' : 'default',
                                    '&:hover': {
                                        color: onViewHost ? 'primary.main' : 'inherit',
                                        textDecoration: onViewHost ? 'underline' : 'none',
                                    }
                                }}
                            >
                                {host.firstName} {host.lastName}
                            </Typography>
                        );
                    })() : (
                        <Typography variant='body2' sx={{ fontWeight: 600 }}>
                            N/A
                        </Typography>
                    )}
                    {booking.host?.email && (
                        <Typography variant='caption' color='text.secondary'>
                            {booking.host.email}
                        </Typography>
                    )}
                </Box>
            </Stack>
        </Box>
    );
}

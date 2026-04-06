import { Box, Button, Link, Stack, Typography, alpha, useTheme } from '@mui/material';
import { ExternalLink, Video } from 'lucide-react';
import type { Booking } from '@/types';
import { SectionLabel } from './Common';

interface MeetingSectionProps {
    booking: Booking;
    meetingJoinUrl: string | null;
}

export function MeetingSection({ booking, meetingJoinUrl }: MeetingSectionProps) {
    const theme = useTheme();

    return (
        <Box>
            <SectionLabel label='Location' />
            {meetingJoinUrl ? (
                <Box
                    sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                    }}
                >
                    <Stack
                        direction='row'
                        spacing={1.5}
                        alignItems='flex-start'
                        sx={{ mb: 1.5 }}
                    >
                        <Box
                            sx={{
                                p: 0.75,
                                borderRadius: 1,
                                bgcolor: 'primary.main',
                                color: 'white',
                                display: 'flex',
                            }}
                        >
                            <Video size={16} />
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography
                                variant='body2'
                                sx={{ fontWeight: 700, color: 'text.primary', mb: 0.25 }}
                            >
                                Zoom ISV Meeting Room
                            </Typography>
                            <Link
                                href={meetingJoinUrl}
                                target='_blank'
                                rel='noreferrer'
                                variant='caption'
                                sx={{
                                    fontWeight: 500,
                                    color: 'primary.main',
                                    wordBreak: 'break-all',
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                }}
                            >
                                {meetingJoinUrl}
                            </Link>
                        </Box>
                    </Stack>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1.5 }}>
                        <Button
                            component='a'
                            href={meetingJoinUrl}
                            target='_blank'
                            rel='noreferrer'
                            size='small'
                            variant='contained'
                            sx={{
                                px: 2.5,
                                py: 0.5,
                                borderRadius: 100,
                                fontSize: '0.75rem',
                                fontWeight: 700,
                            }}
                            startIcon={<ExternalLink size={12} />}
                        >
                            Join session
                        </Button>
                    </Box>
                </Box>
            ) : (
                <Typography variant='body2' color='text.secondary'>
                    {booking.event?.locationType === 'VIRTUAL'
                        ? 'Virtual'
                        : 'In-person'}
                    : {booking.event?.locationValue || 'Pending setup'}
                </Typography>
            )}
        </Box>
    );
}

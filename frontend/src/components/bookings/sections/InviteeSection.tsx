import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { toTitleCase } from '@/utils/toTitleCase';
import { Link as RouterLink } from 'react-router-dom';
import type { Booking } from '@/types';
import { SectionLabel } from './Common';

interface InviteeSectionProps {
    booking: Booking;
}

export function InviteeSection({ booking }: InviteeSectionProps) {
    const theme = useTheme();

    return (
        <Box>
            <SectionLabel label='Invitee' />
            <Stack direction='row' spacing={2} alignItems='center'>
                <Avatar
                    sx={{
                        width: 44,
                        height: 44,
                        fontSize: '1rem',
                        bgcolor: alpha(theme.palette.secondary.main, 0.08),
                        color: theme.palette.secondary.main,
                        fontWeight: 700,
                    }}
                >
                    {toTitleCase(booking.studentName)
                        .split(' ')
                        .map((name) => name[0])
                        .join('')
                        .toUpperCase()}
                </Avatar>
                <Box>
                    {booking.studentId ? (
                        <Typography
                            variant='body1'
                            component={RouterLink}
                            to={`/students/${booking.studentId}`}
                            sx={{
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                                textDecoration: 'none',
                                '&:hover': {
                                    color: 'primary.main',
                                    textDecoration: 'underline',
                                }
                            }}
                        >
                            {toTitleCase(booking.studentName)}
                        </Typography>
                    ) : (
                        <Typography
                            variant='body1'
                            sx={{ fontWeight: 600, color: theme.palette.text.primary }}
                        >
                            {toTitleCase(booking.studentName)}
                        </Typography>
                    )}
                    <Typography variant='body2' color='text.secondary'>
                        {booking.studentEmail}
                    </Typography>
                </Box>
            </Stack>
        </Box>
    );
}

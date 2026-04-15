import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { alpha } from '@mui/material/styles'
import Stack from '@mui/material/Stack'
import { CheckCircle2 } from 'lucide-react'
import LogoOrange from '@/assets/Color=Orange.svg'

interface SuccessStepProps {
    email: string
    onReset: () => void
    mode?: 'booking' | 'reschedule'
    eventName?: string
    newDate?: Date
    newTime?: string
}

export function SuccessStep({ email, onReset, mode = 'booking', eventName, newDate, newTime }: SuccessStepProps) {
    const isReschedule = mode === 'reschedule';

    return (
        <Box sx={{ textAlign: 'center', py: 8, px: 2, maxWidth: 600, mx: 'auto' }}>
            <Box
                component="img"
                src={LogoOrange}
                alt="Chegg Skills"
                sx={{ width: 220, height: 'auto', mb: 6 }}
            />

            <Typography variant="h4" fontWeight={900} gutterBottom sx={{
                letterSpacing: -1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                color: (theme) => theme.palette.primary.main
            }}>
                {isReschedule ? 'Reschedule Confirmed!' : 'Booking Confirmed!'}
                <CheckCircle2 size={36} color="#1DA275" strokeWidth={3} />
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, fontSize: '1.1rem', fontWeight: 500 }}>
                {isReschedule
                    ? `Your session${eventName ? ` for ${eventName}` : ''} has been successfully rescheduled.`
                    : `Your session${eventName ? ` for ${eventName}` : ''} has been successfully booked.`
                }
            </Typography>

            {(newDate || newTime) && (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 3,
                        mb: 4,
                        bgcolor: (theme) => alpha(theme.palette.info.main, 0.03),
                        borderColor: (theme) => alpha(theme.palette.info.main, 0.1),
                        borderRadius: 3,
                        textAlign: 'left',
                        borderLeft: '4px solid',
                        borderLeftColor: 'info.main'
                    }}
                >
                    <Stack spacing={2}>
                        {newDate && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    New Date
                                </Typography>
                                <Typography variant="body1" fontWeight={700} color="info.dark">
                                    {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(newDate)}
                                </Typography>
                            </Box>
                        )}
                        {newTime && (
                            <Box>
                                <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                    New Time
                                </Typography>
                                <Typography variant="body1" fontWeight={700} color="info.dark">
                                    {newTime}
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </Paper>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                A confirmation email has been sent to <strong>{email}</strong>. Please check your inbox for the calendar invite and details.
            </Typography>

            <Button
                variant="contained"
                onClick={onReset}
                size="large"
                sx={{ px: 4, py: 1.5, fontWeight: 700, borderRadius: 2 }}
            >
                {isReschedule ? 'Back to Dashboard' : 'Book Another Session'}
            </Button>
        </Box>
    )
}

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { useTheme } from '@mui/material/styles'
import Stack from '@mui/material/Stack'
import { toTitleCase } from '@/utils/toTitleCase'
import { Check } from 'lucide-react'
import LogoOrange from '@/assets/Color=Orange.svg'

interface SuccessStepProps {
    email: string
    onReset: () => void
    mode?: 'booking' | 'reschedule'
    eventName?: string
    newDate?: Date | null
    newTime?: string | null
    mentorName?: string | null
}

export function SuccessStep({ email, onReset, mode = 'booking', eventName, newDate, newTime, mentorName }: SuccessStepProps) {
    const isReschedule = mode === 'reschedule';
    const theme = useTheme();

    return (
        <Paper
            elevation={0}
            sx={{
                maxWidth: 480,
                width: '100%',
                mx: 'auto',
                my: { xs: 2, sm: 4 },
                p: { xs: 3, sm: 4 },
                textAlign: 'center',
                borderRadius: 1.5,
                border: '1.5px solid #1DA275',
                bgcolor: 'background.paper',
                boxShadow: 'none',
                fontFamily: theme.typography.fontFamily,
                display: 'block',
                position: 'relative'
            }}
        >
            <Box
                component="img"
                src={LogoOrange}
                alt="Chegg Skills"
                sx={{ width: 140, height: 'auto', mb: 4 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: '50%',
                        bgcolor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    }}
                >
                    <Check size={28} strokeWidth={3} />
                </Box>
            </Box>

            <Typography
                variant="h5"
                sx={{
                    color: 'primary.main',
                    mb: 1,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                }}
            >
                {isReschedule ? 'Reschedule confirmed!' : 'Booking confirmed!'}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.primary', mb: 3, fontWeight: 500 }}>
                Your session has been successfully {isReschedule ? 'rescheduled' : 'booked'}.
            </Typography>

            <Box
                sx={{
                    p: 2.5,
                    mb: 3,
                    bgcolor: 'accent.peach',
                    borderRadius: 1.5,
                    textAlign: 'left',
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Typography
                    variant="caption"
                    sx={{ color: 'text.primary', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                    Session details
                </Typography>

                <Stack spacing={1}>
                    <Box>
                        <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                            {toTitleCase(eventName || 'Session Title')}
                        </Typography>
                        {newDate && (
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                                {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(newDate)}
                            </Typography>
                        )}
                        {newTime && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {newTime}
                            </Typography>
                        )}
                    </Box>

                    {mentorName && (
                        <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary' }}>
                            Mentor: {toTitleCase(mentorName)}
                        </Typography>
                    )}
                </Stack>
            </Box>

            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 3.5, display: 'block', lineHeight: 1.5 }}>
                A confirmation email has been sent to <strong>{email}</strong>.<br />
                Check your inbox for the calendar invite and details.
            </Typography>

            <Button
                variant="contained"
                onClick={onReset}
                sx={{
                    px: 4,
                    py: 1.25,
                    fontSize: '0.875rem',
                    fontWeight: 800,
                    borderRadius: 1.5,
                    bgcolor: 'primary.main',
                    textTransform: 'none',
                    '&:hover': {
                        bgcolor: 'primary.dark',
                    }
                }}
            >
                {isReschedule ? 'Return to dashboard' : 'Book another session'}
            </Button>
        </Paper>
    )
}

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import Stack from '@mui/material/Stack'
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
    const theme = useTheme();

    return (
        <Box sx={{
            maxWidth: 540,
            mx: 'auto',
            py: { xs: 4, sm: 6 },
            px: { xs: 2, sm: 4 },
            textAlign: 'center'
        }}>
            <Box
                component="img"
                src={LogoOrange}
                alt="Chegg Skills"
                sx={{ width: 140, height: 'auto', mb: 5 }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                <Box
                    sx={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        bgcolor: '#1DA275',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                    }}
                >
                    <Check size={36} strokeWidth={3} />
                </Box>
            </Box>

            <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                    color: 'primary.main',
                    mb: 1.5,
                    letterSpacing: -0.5
                }}
            >
                {isReschedule ? 'Reschedule Confirmed!' : 'Booking Confirmed!'}
            </Typography>

            <Typography variant="body1" sx={{ color: 'text.primary', mb: 4, fontSize: '1.1rem', fontWeight: 500 }}>
                Your session has been successfully {isReschedule ? 'rescheduled' : 'booked'}.
            </Typography>

            <Box
                sx={{
                    p: 4,
                    mb: 4,
                    bgcolor: '#FFF5EF', // Very light peach
                    borderRadius: 2,
                    textAlign: 'left',
                    border: '1px solid',
                    borderColor: 'rgba(232, 113, 0, 0.1)'
                }}
            >
                <Typography
                    variant="subtitle2"
                    fontWeight={800}
                    sx={{ color: 'text.primary', mb: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                    Session Details:
                </Typography>

                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary' }}>
                            {eventName || 'Session Title'}
                        </Typography>
                        {newDate && (
                            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                                {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(newDate)}
                            </Typography>
                        )}
                        {newTime && (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {newTime}
                            </Typography>
                        )}
                    </Box>

                    {mentorName && (
                        <Typography variant="body1" fontWeight={700} sx={{ color: 'text.primary', pt: 0.5 }}>
                            Mentor: {mentorName}
                        </Typography>
                    )}
                </Stack>
            </Box>

            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 5, lineHeight: 1.6 }}>
                A confirmation email has been sent to <strong>{email}</strong>.<br />
                Please check your inbox for the calendar invite and details.
            </Typography>

            <Button
                variant="contained"
                onClick={onReset}
                sx={{
                    px: 6,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 800,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    textTransform: 'none',
                    '&:hover': {
                        bgcolor: 'primary.dark',
                    }
                }}
            >
                {isReschedule ? 'Return to Dashboard' : 'Book Another Session'}
            </Button>
        </Box>
    )
}

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import { alpha } from '@mui/material/styles'
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
    const isReschedule = mode === 'reschedule';

    return (
        <Box sx={{ p: { xs: 1, sm: 2 }, display: 'flex', justifyContent: 'center' }}>
            <Paper
                elevation={0}
                sx={{
                    maxWidth: 540,
                    width: '100%',
                    p: { xs: 3, sm: 6 },
                    textAlign: 'center',
                    borderRadius: 8,
                    border: '2px solid #1DA275',
                    bgcolor: 'background.paper',
                }}
            >
                <Box
                    component="img"
                    src={LogoOrange}
                    alt="Chegg Skills"
                    sx={{ width: 160, height: 'auto', mb: 5 }}
                />

                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                    <Box
                        sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            bgcolor: '#1DA275',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 8px 16px rgba(29, 162, 117, 0.2)'
                        }}
                    >
                        <Check size={40} strokeWidth={3} />
                    </Box>
                </Box>

                <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{
                        color: '#EB7100',
                        mb: 1.5,
                        letterSpacing: -0.5
                    }}
                >
                    {isReschedule ? 'Reschedule Confirmed!' : 'Booking Confirmed!'}
                </Typography>

                <Typography variant="body1" sx={{ color: '#3A3A3A', mb: 5, fontSize: '1.1rem' }}>
                    Your session has been successfully {isReschedule ? 'rescheduled' : 'booked'}.
                </Typography>

                <Box
                    sx={{
                        p: 4,
                        mb: 6,
                        bgcolor: '#FFF5F0', // Light peach/orange tint
                        borderRadius: 4,
                        textAlign: 'left',
                    }}
                >
                    <Typography
                        variant="subtitle1"
                        fontWeight={800}
                        sx={{ color: '#3A3A3A', mb: 2 }}
                    >
                        Session Details:
                    </Typography>

                    <Stack spacing={1.5}>
                        <Box>
                            <Typography variant="body1" fontWeight={700} sx={{ color: '#3A3A3A' }}>
                                {eventName || 'Session Title'}
                            </Typography>
                            {newDate && (
                                <Typography variant="body2" sx={{ color: '#717171', mt: 0.5 }}>
                                    {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(newDate)}
                                </Typography>
                            )}
                            {newTime && (
                                <Typography variant="body2" sx={{ color: '#717171' }}>
                                    {newTime}
                                </Typography>
                            )}
                        </Box>

                        {mentorName && (
                            <Typography variant="body1" fontWeight={700} sx={{ color: '#3A3A3A', pt: 0.5 }}>
                                Mentor: {mentorName}
                            </Typography>
                        )}
                    </Stack>
                </Box>

                <Typography variant="body2" sx={{ color: '#717171', mb: 5, lineHeight: 1.6 }}>
                    A confirmation email has been sent to <strong>{email}</strong>.<br />
                    Please check your inbox for the calendar invite and details.
                </Typography>

                <Button
                    variant="contained"
                    onClick={onReset}
                    fullWidth
                    sx={{
                        py: 2,
                        fontSize: '1.1rem',
                        fontWeight: 800,
                        borderRadius: '40px',
                        bgcolor: '#EB7100',
                        textTransform: 'none',
                        boxShadow: '0 8px 20px rgba(235, 113, 0, 0.3)',
                        '&:hover': {
                            bgcolor: '#D66500',
                            boxShadow: '0 10px 25px rgba(235, 113, 0, 0.4)',
                        }
                    }}
                >
                    {isReschedule ? 'Back to Dashboard' : 'Book Another Session'}
                </Button>
            </Paper>
        </Box>
    )
}

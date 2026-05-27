import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Paper, Stack } from '@mui/material'
import { Check } from 'lucide-react'
import LogoOrange from '@/assets/Color=Orange.svg'
import type { PublicBooking } from '@/types'

interface SuccessViewProps {
  booking?: PublicBooking
  publicBookingUrl?: string
}

export function SuccessView({ booking, publicBookingUrl }: SuccessViewProps) {
  const navigate = useNavigate()
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
          borderRadius: 2,
          border: '1.5px solid',
          borderColor: 'success.main',
          bgcolor: 'background.paper',
          boxShadow: 'none',
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
          sx={{ color: 'text.primary', mb: 1.5, fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Session cancelled
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mb: 3, fontWeight: 500, lineHeight: 1.6 }}
        >
          Your session has been successfully cancelled. A confirmation email has been sent to your
          inbox.
        </Typography>

        {booking && (
          <Box
            sx={{
              p: 2.5,
              mb: 4,
              bgcolor: 'accent.peach',
              borderRadius: 1.5,
              textAlign: 'left',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.primary',
                fontWeight: 700,
                mb: 1.5,
                display: 'block',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Cancelled Session Details
            </Typography>

            <Stack spacing={1}>
              <Box>
                <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                  {booking.event?.name || 'Session'}
                </Typography>
                {booking.startTime && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}
                  >
                    {new Intl.DateTimeFormat('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    }).format(new Date(booking.startTime))}
                  </Typography>
                )}
                {booking.startTime && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {new Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: booking.timezone || 'UTC',
                    }).format(new Date(booking.startTime))}{' '}
                    ({booking.timezone || 'UTC'})
                  </Typography>
                )}
              </Box>

              {booking.coach && (
                <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary' }}>
                  Coach: {booking.coach.firstName} {booking.coach.lastName}
                </Typography>
              )}
            </Stack>
          </Box>
        )}

        <Button
          variant="contained"
          onClick={() => navigate(publicBookingUrl || '/')}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '0.875rem',
            fontWeight: 800,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            textTransform: 'none',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          Book another session
        </Button>
      </Paper>
    </Box>
  )
}

import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Paper } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { XCircle } from 'lucide-react'
import LogoOrange from '@/assets/Color=Orange.svg'

interface AlreadyCancelledViewProps {
  publicBookingUrl?: string
}

export function AlreadyCancelledView({ publicBookingUrl }: AlreadyCancelledViewProps) {
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
          borderColor: 'divider',
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
              bgcolor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <XCircle size={28} strokeWidth={2.5} />
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{ color: 'text.primary', mb: 1.5, fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Already cancelled
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mb: 4, fontWeight: 500, lineHeight: 1.6 }}
        >
          Your session has already been cancelled. No further action is needed.
        </Typography>

        <Button
          variant="outlined"
          onClick={() => navigate(publicBookingUrl || '/')}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: '0.875rem',
            fontWeight: 700,
            borderRadius: 1.5,
            textTransform: 'none',
            color: 'text.secondary',
            borderColor: 'divider',
            '&:hover': {
              color: 'primary.main',
              borderColor: 'primary.main',
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          Book another session
        </Button>
      </Paper>
    </Box>
  )
}

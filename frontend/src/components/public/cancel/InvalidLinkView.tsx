import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Paper } from '@mui/material'
import { AlertTriangle } from 'lucide-react'
import LogoOrange from '@/assets/Color=Orange.svg'

export function InvalidLinkView() {
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
          borderColor: 'error.main',
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
              bgcolor: 'error.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'error.main',
            }}
          >
            <AlertTriangle size={28} strokeWidth={2.5} />
          </Box>
        </Box>

        <Typography
          variant="h5"
          sx={{ color: 'text.primary', mb: 1.5, fontWeight: 800, letterSpacing: '-0.02em' }}
        >
          Link no longer valid
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', mb: 4, fontWeight: 500, lineHeight: 1.6 }}
        >
          This cancellation link is no longer valid or has expired. The session may have already
          started, or the link has been used.
        </Typography>

        <Button
          variant="contained"
          onClick={() => navigate('/')}
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
          Back to homepage
        </Button>
      </Paper>
    </Box>
  )
}

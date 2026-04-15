import Box from '@mui/material/Box'
import MuiLink from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import LogoOrange from '@/assets/Color=Orange.svg'

export function LoginPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, bgcolor: 'background.default' }}>
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 420 }}>
        <Stack spacing={4} textAlign="center">
          <Box
            component="img"
            src={LogoOrange}
            alt="Chegg Skills"
            sx={{
              height: 40,
              width: 'auto',
              mx: 'auto',
              display: 'block',
              mb: 1
            }}
          />
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Sign in</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Enter your credentials to access the scheduling app.
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: 4 }}>
          <LoginForm />
        </Paper>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          <MuiLink component={RouterLink} to="/bootstrap" color="primary" underline="hover">
            Set up admin account
          </MuiLink>
        </Typography>
      </Stack>
    </Box>
  )
}

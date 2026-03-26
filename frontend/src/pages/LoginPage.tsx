import Box from '@mui/material/Box'
import MuiLink from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'

export function LoginPage() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, bgcolor: 'background.default' }}>
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 420 }}>
        <Stack spacing={1} textAlign="center">
          <Typography variant="h4">Sign in</Typography>
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

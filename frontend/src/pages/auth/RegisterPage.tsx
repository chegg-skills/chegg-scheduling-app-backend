import Box from '@mui/material/Box'
import MuiLink from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link as RouterLink } from 'react-router-dom'
import { RegisterForm } from '@/components/auth/RegisterForm'

export function RegisterPage() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        bgcolor: 'background.default',
      }}
    >
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 480 }}>
        <Stack spacing={1} textAlign="center">
          <Typography variant="h4">Create account</Typography>
          <Typography variant="body2" color="text.secondary">
            Join the scheduling app to start managing your events.
          </Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: 4 }}>
          <RegisterForm />
        </Paper>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Already have an account?{' '}
          <MuiLink component={RouterLink} to="/login" color="primary" underline="hover">
            Sign in
          </MuiLink>
        </Typography>
      </Stack>
    </Box>
  )
}

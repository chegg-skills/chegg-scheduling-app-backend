import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSearchParams, Link as RouterLink } from 'react-router-dom'
import { AcceptInviteForm } from '@/components/auth/AcceptInviteForm'

export function AcceptInvitePage() {
  const [params] = useSearchParams()
  const token = params.get('token')

  if (!token) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, bgcolor: 'background.default' }}>
        <Stack spacing={1.5} sx={{ maxWidth: 420, textAlign: 'center' }}>
          <Typography variant="h5">Invalid invite link</Typography>
          <Typography variant="body2" color="text.secondary">
            The invite link is missing or malformed. Please request a new one.
          </Typography>
          <Link component={RouterLink} to="/login" color="primary" underline="hover">
            Back to sign in
          </Link>
        </Stack>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, bgcolor: 'background.default' }}>
      <Stack spacing={3} sx={{ width: '100%', maxWidth: 420 }}>
        <Stack spacing={1} textAlign="center">
          <Typography variant="h4">Create your account</Typography>
          <Typography variant="body2" color="text.secondary">You've been invited to join the scheduling app.</Typography>
        </Stack>
        <Paper variant="outlined" sx={{ p: 4 }}>
          <AcceptInviteForm token={token} />
        </Paper>
      </Stack>
    </Box>
  )
}

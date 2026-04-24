import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useSearchParams, Link as RouterLink } from 'react-router-dom'

const ERROR_MESSAGES: Record<string, string> = {
  no_account:
    'No account is associated with this identity. You must be invited before signing in with SSO.',
  email_mismatch:
    'The SSO email address does not match your invite. Please use the same email you were invited with.',
  invalid_state: 'The sign-in request expired or was invalid. Please try signing in again.',
  forbidden: 'This sign-in method is not permitted for your account.',
  inactive: 'Your account has been deactivated. Please contact an administrator.',
  invite_expired: 'The invite link has expired. Please request a new one.',
  invite_already_accepted: 'This invite has already been used.',
  invite_not_found: 'The invite link is invalid.',
  invite_not_sso: 'This invite does not require SSO sign-in.',
  missing_invite_token: 'The invite token is missing from the link.',
  user_already_exists: 'An account with this email already exists.',
}

export function SsoErrorPage() {
  const [params] = useSearchParams()
  const reason = params.get('reason') ?? 'unknown'

  const message =
    ERROR_MESSAGES[reason] ??
    'An unexpected error occurred during sign-in. Please try again or contact support.'

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
      <Stack spacing={2} sx={{ maxWidth: 440, textAlign: 'center' }}>
        <Typography variant="h5">Sign-in failed</Typography>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        <Link component={RouterLink} to="/login" color="primary" underline="hover">
          Back to sign in
        </Link>
      </Stack>
    </Box>
  )
}

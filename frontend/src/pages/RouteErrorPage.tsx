import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'

function getErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    return {
      title: `${error.status} ${error.statusText}`,
      message: typeof error.data === 'string' ? error.data : 'Something went wrong while loading this page.',
    }
  }

  if (error instanceof Error) {
    return {
      title: 'Unexpected Error',
      message: error.message,
    }
  }

  return {
    title: 'Unexpected Error',
    message: 'Something went wrong while loading this page.',
  }
}

export function RouteErrorPage() {
  const error = useRouteError()
  const navigate = useNavigate()
  const { title, message } = getErrorMessage(error)

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 640, p: 4 }}>
        <Stack spacing={2}>
          <Typography variant="h4">Something went wrong</Typography>
          <Alert severity="error" variant="outlined">
            <AlertTitle>{title}</AlertTitle>
            {message}
          </Alert>
          <Stack direction="row" spacing={1.5}>
            <Button variant="contained" onClick={() => navigate('/dashboard')}>
              Go to dashboard
            </Button>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              Go back
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}

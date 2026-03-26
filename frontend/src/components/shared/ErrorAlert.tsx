import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'

interface ErrorAlertProps {
  title?: string
  message: string
}

export function ErrorAlert({ title = 'Error', message }: ErrorAlertProps) {
  return (
    <Alert severity="error" variant="outlined">
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  )
}

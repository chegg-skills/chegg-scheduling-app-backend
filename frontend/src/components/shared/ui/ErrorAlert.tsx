import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import type { AlertColor } from '@mui/material'
import { alpha } from '@mui/material/styles'

interface ErrorAlertProps {
  title?: string
  message: string
  severity?: AlertColor
}

export function ErrorAlert({ title = 'Error', message, severity = 'error' }: ErrorAlertProps) {
  return (
    <Alert
      severity={severity}
      sx={{
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: (theme) =>
          severity === 'error'
            ? alpha(theme.palette.error.main, 0.3)
            : severity === 'warning'
              ? alpha(theme.palette.warning.main, 0.3)
              : alpha(theme.palette.info.main, 0.3),
        backgroundColor: (theme) =>
          severity === 'error'
            ? alpha(theme.palette.error.main, 0.05)
            : severity === 'warning'
              ? alpha(theme.palette.warning.main, 0.05)
              : alpha(theme.palette.info.main, 0.05),
        color: (theme) =>
          severity === 'error'
            ? theme.palette.error.dark
            : severity === 'warning'
              ? theme.palette.warning.dark
              : theme.palette.info.dark,
        '& .MuiAlert-icon': {
          alignItems: 'center',
          color: (theme) =>
            severity === 'error'
              ? theme.palette.error.main
              : severity === 'warning'
                ? theme.palette.warning.main
                : theme.palette.info.main,
        },
      }}
    >
      <AlertTitle sx={{ fontWeight: 700, mb: 0.5 }}>{title}</AlertTitle>
      {message}
    </Alert>
  )
}

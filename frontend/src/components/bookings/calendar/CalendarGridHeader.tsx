import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, useTheme } from '@mui/material/styles'

export function CalendarGridHeader() {
  const theme = useTheme()
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: alpha(theme.palette.text.primary, 0.02),
      }}
    >
      {weekDays.map((day) => (
        <Box key={day} sx={{ py: 1.5, textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: 'text.secondary',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {day}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

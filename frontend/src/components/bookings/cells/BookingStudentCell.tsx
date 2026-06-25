import { Avatar, Box, Stack, Typography, alpha, useTheme, Link as MuiLink } from '@mui/material'
import { Link } from 'react-router-dom'
import { toTitleCase } from '@/utils/toTitleCase'

interface BookingStudentCellProps {
  name: string
  email: string
  studentId?: string | null
}

export function BookingStudentCell({ name, email, studentId }: BookingStudentCellProps) {
  const theme = useTheme()

  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Avatar
        sx={{
          width: 34,
          height: 34,
          fontSize: '0.8125rem',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          fontWeight: 700,
        }}
      >
        {toTitleCase(name)
          .split(' ')
          .filter(Boolean)
          .map((n) => n[0])
          .join('')
          .toUpperCase() || '?'}
      </Avatar>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {studentId ? (
            <MuiLink
              component={Link}
              to={`/students/${studentId}`}
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              {toTitleCase(name)}
            </MuiLink>
          ) : (
            toTitleCase(name)
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {email}
        </Typography>
      </Box>
    </Stack>
  )
}

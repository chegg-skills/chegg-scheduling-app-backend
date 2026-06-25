import { Box, Typography, Link as MuiLink } from '@mui/material'
import { Link } from 'react-router-dom'
import { toTitleCase } from '@/utils/toTitleCase'

interface BookingStudentCellProps {
  name: string
  email: string
  studentId?: string | null
}

export function BookingStudentCell({ name, email, studentId }: BookingStudentCellProps) {
  return (
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
  )
}

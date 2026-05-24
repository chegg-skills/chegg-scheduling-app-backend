import { TableRow, TableCell, Typography, Box, Avatar, alpha, Link as MuiLink, IconButton, Tooltip } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Link, useNavigate } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import { toTitleCase } from '@/utils/toTitleCase'
import { Mail } from 'lucide-react'
import type { StudentSummary } from '@/types'

interface StudentTableRowProps {
  student: StudentSummary
  onSendEmail?: (student: StudentSummary) => void
}

const getRelativeTime = (startTime: string) => {
  const days = differenceInDays(new Date(), new Date(startTime))

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days > 1) return `${days} days ago`
  return `in ${Math.abs(days)} days`
}



export function StudentTableRow({ student, onSendEmail }: StudentTableRowProps) {
  const theme = useTheme()
  const navigate = useNavigate()

  const handleRowClick = () => {
    navigate(`/students/${student.id}`)
  }

  return (
    <TableRow hover onClick={handleRowClick} sx={{ cursor: 'pointer' }}>
      <TableCell sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: '0.875rem',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: theme.palette.primary.main,
              fontWeight: 700,
            }}
          >
            {student.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              <MuiLink
                component={Link}
                to={`/students/${student.id}`}
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
                {toTitleCase(student.fullName)}
              </MuiLink>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {student.email}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Typography variant="body2" fontWeight={600}>
          {student.bookingCount}
        </Typography>
      </TableCell>
      <TableCell>
        {student.latestBooking ? (
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {toTitleCase(student.latestBooking.event.name)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {format(new Date(student.latestBooking.startTime), 'MMM d, yyyy')}{' '}
              <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                ({getRelativeTime(student.latestBooking.startTime)})
              </Box>
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            N/A
          </Typography>
        )}
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        {onSendEmail && (
          <Tooltip title="Send email to student" arrow>
            <IconButton
              size="medium"
              onClick={() => onSendEmail(student)}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Mail size={20} />
            </IconButton>
          </Tooltip>
        )}
      </TableCell>
    </TableRow>
  )
}

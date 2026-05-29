import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { Link as RouterLink } from 'react-router-dom'
import { User } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingSection } from './Common'
import React from 'react'
import { useTimezones } from '@/hooks/queries/useConfig'
import { formatTimezoneLabel } from '@/components/users/userSystemFieldUtils'

// Stable reference — timezone never changes during the session
const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

interface InviteeSectionProps {
  booking: Booking
}

interface StudentLocalTimeProps {
  startTime: string
  timezone: string
  formatter: Intl.DateTimeFormat
}

function StudentLocalTime({ startTime, timezone, formatter }: StudentLocalTimeProps) {
  const { data: timezones = [] } = useTimezones()
  const start = new Date(startTime)

  return (
    <Box
      sx={{
        mt: 2,
        p: 1.5,
        bgcolor: 'action.hover',
        borderRadius: 1.5,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: 'text.secondary',
          display: 'block',
          textTransform: 'uppercase',
          fontSize: '0.65rem',
          letterSpacing: '0.05em',
          mb: 0.5,
        }}
      >
        Student's Local Time
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.8125rem' }}
      >
        {formatter.format(start)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
        <strong>Timezone:</strong> {formatTimezoneLabel(timezone, timezones)}
      </Typography>
    </Box>
  )
}

export function InviteeSection({ booking }: InviteeSectionProps) {
  const theme = useTheme()

  const studentFormatter = React.useMemo(() => {
    if (!booking.timezone) return null
    try {
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: booking.timezone,
        timeZoneName: 'short',
      })
    } catch {
      return null
    }
  }, [booking.timezone])

  const showStudentTime = booking.timezone && booking.timezone !== LOCAL_TZ && studentFormatter

  return (
    <BookingSection label="Invitee" icon={<User size={16} />}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.875rem',
            bgcolor: alpha(theme.palette.secondary.main, 0.08),
            color: theme.palette.secondary.main,
            fontWeight: 700,
          }}
        >
          {toTitleCase(booking.studentName)
            .split(' ')
            .map((name) => name[0])
            .join('')
            .toUpperCase()}
        </Avatar>
        <Box>
          {booking.studentId ? (
            <Typography
              variant="body2"
              component={RouterLink}
              to={`/students/${booking.studentId}`}
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                textDecoration: 'none',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              {toTitleCase(booking.studentName)}
            </Typography>
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
              {toTitleCase(booking.studentName)}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {booking.studentEmail}
          </Typography>
        </Box>
      </Stack>

      {showStudentTime && (
        <StudentLocalTime
          startTime={booking.startTime}
          timezone={booking.timezone}
          formatter={studentFormatter}
        />
      )}
    </BookingSection>
  )
}

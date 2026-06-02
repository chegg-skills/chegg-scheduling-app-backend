import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { UserCheck, User } from 'lucide-react'
import type { Booking } from '@/types'
import { BookingSection } from './Common'
import { useBookingView } from '@/context/bookingView'

interface CoachSectionProps {
  booking: Booking
}

export function CoachSection({ booking }: CoachSectionProps) {
  const theme = useTheme()
  const { onViewCoach } = useBookingView()

  const hasCoCoaches = booking.coCoachUserIds?.length > 0
  const labelText = hasCoCoaches ? 'Lead Coach & Team' : 'Coach'

  return (
    <BookingSection label={labelText} icon={<UserCheck size={16} />}>
      {hasCoCoaches && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          This coach leads the session with support from co-coaches
        </Typography>
      )}

      <Stack direction="row" spacing={1.5} alignItems="center">
        <Avatar
          src={booking.coach?.avatarUrl ?? undefined}
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.875rem',
            bgcolor: alpha(theme.palette.secondary.main, 0.05),
            color: theme.palette.secondary.main,
            fontWeight: 600,
          }}
        >
          {booking.coach ? (
            `${booking.coach.firstName[0]}${booking.coach.lastName[0]}`
          ) : (
            <User size={18} />
          )}
        </Avatar>
        <Box>
          {booking.coach ? (
            (() => {
              const coach = booking.coach
              return (
                <Typography
                  variant="body2"
                  onClick={() => onViewCoach?.(coach.id)}
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    textDecoration: 'none',
                    cursor: onViewCoach ? 'pointer' : 'default',
                    '&:hover': {
                      color: onViewCoach ? 'primary.main' : 'inherit',
                      textDecoration: onViewCoach ? 'underline' : 'none',
                    },
                  }}
                >
                  {toTitleCase(coach.firstName)} {toTitleCase(coach.lastName)}
                </Typography>
              )
            })()
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              N/A
            </Typography>
          )}
          {booking.coach?.email && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              {booking.coach.email}
            </Typography>
          )}
        </Box>
      </Stack>

      {hasCoCoaches && (
        <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'text.secondary',
              display: 'block',
              mb: 1.5,
              fontSize: '0.65rem',
              letterSpacing: '0.05em',
            }}
          >
            Co-coaches
          </Typography>
          <Stack spacing={1.5}>
            {booking.coCoachUserIds.map((coCoachId) => {
              const coCoach = booking.event?.coaches?.find(
                (c) => c.coachUserId === coCoachId
              )?.coachUser
              if (!coCoach) return null

              return (
                <Stack key={coCoachId} direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={coCoach.avatarUrl ?? undefined}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.75rem',
                      bgcolor: alpha(theme.palette.secondary.main, 0.03),
                      color: theme.palette.secondary.main,
                    }}
                  >
                    {coCoach.firstName[0]}
                    {coCoach.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body2"
                      onClick={() => onViewCoach?.(coCoach.id)}
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.8125rem',
                        cursor: onViewCoach ? 'pointer' : 'default',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {toTitleCase(coCoach.firstName)} {toTitleCase(coCoach.lastName)}
                    </Typography>
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        </Box>
      )}
    </BookingSection>
  )
}

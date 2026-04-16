import { Avatar, Box, Stack, Typography, alpha, useTheme } from '@mui/material'
import { toTitleCase } from '@/utils/toTitleCase'
import { User } from 'lucide-react'
import type { Booking } from '@/types'
import { SectionLabel } from './Common'
import { useBookingView } from '@/context/BookingViewContext'

interface HostSectionProps {
  booking: Booking
}

export function HostSection({ booking }: HostSectionProps) {
  const theme = useTheme()
  const { onViewHost } = useBookingView()

  return (
    <Box>
      <SectionLabel label={booking.coHostUserIds?.length > 0 ? 'Lead Coach' : 'Meeting Host'} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {booking.coHostUserIds?.length > 0
          ? 'This coach leads the session'
          : 'Coach will attend this meeting'}
      </Typography>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        sx={{ mb: booking.coHostUserIds?.length > 0 ? 3 : 0 }}
      >
        <Avatar
          src={booking.host?.avatarUrl ?? undefined}
          sx={{
            width: 36,
            height: 36,
            fontSize: '0.875rem',
            bgcolor: alpha(theme.palette.secondary.main, 0.05),
            color: theme.palette.secondary.main,
            fontWeight: 600,
          }}
        >
          {booking.host ? (
            `${booking.host.firstName[0]}${booking.host.lastName[0]}`
          ) : (
            <User size={18} />
          )}
        </Avatar>
        <Box>
          {booking.host ? (
            (() => {
              const host = booking.host
              return (
                <Typography
                  variant="body2"
                  onClick={() => onViewHost?.(host.id)}
                  sx={{
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                    textDecoration: 'none',
                    cursor: onViewHost ? 'pointer' : 'default',
                    '&:hover': {
                      color: onViewHost ? 'primary.main' : 'inherit',
                      textDecoration: onViewHost ? 'underline' : 'none',
                    },
                  }}
                >
                  {toTitleCase(host.firstName)} {toTitleCase(host.lastName)}
                </Typography>
              )
            })()
          ) : (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              N/A
            </Typography>
          )}
          {booking.host?.email && (
            <Typography variant="caption" color="text.secondary">
              {booking.host.email}
            </Typography>
          )}
        </Box>
      </Stack>

      {booking.coHostUserIds?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <SectionLabel label="Co-hosts" />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Supporting coaches for this session
          </Typography>
          <Stack spacing={1.5}>
            {booking.coHostUserIds.map((coHostId) => {
              const coHost = booking.event?.hosts?.find((h) => h.hostUserId === coHostId)?.hostUser
              if (!coHost) return null

              return (
                <Stack key={coHostId} direction="row" spacing={1.5} alignItems="center">
                  <Avatar
                    src={coHost.avatarUrl ?? undefined}
                    sx={{
                      width: 28,
                      height: 28,
                      fontSize: '0.75rem',
                      bgcolor: alpha(theme.palette.secondary.main, 0.03),
                      color: theme.palette.secondary.main,
                    }}
                  >
                    {coHost.firstName[0]}
                    {coHost.lastName[0]}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body2"
                      onClick={() => onViewHost?.(coHost.id)}
                      sx={{
                        fontWeight: 500,
                        fontSize: '0.8125rem',
                        cursor: onViewHost ? 'pointer' : 'default',
                        '&:hover': { color: 'primary.main' },
                      }}
                    >
                      {toTitleCase(coHost.firstName)} {toTitleCase(coHost.lastName)}
                    </Typography>
                  </Box>
                </Stack>
              )
            })}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

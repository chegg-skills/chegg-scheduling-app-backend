import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import { alpha } from '@mui/material/styles'
import { useTheme } from '@mui/material/styles'
import { format } from 'date-fns'
import { Calendar, Clock, Users, BookOpen } from 'lucide-react'
import { BookingStatusBadge } from '@/components/bookings/BookingStatusBadge'
import { toTitleCase } from '@/utils/toTitleCase'
import type { StudentSummary } from '@/types'

interface StudentLastBookingCardProps {
  latestBooking: NonNullable<StudentSummary['latestBooking']>
  firstBookedAt: string | null
  lastBookedAt: string | null
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: 'text.secondary', mt: 0.25, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}
        >
          {label}
        </Typography>
        <Box sx={{ mt: 0.25 }}>{value}</Box>
      </Box>
    </Stack>
  )
}

export function StudentLastBookingCard({
  latestBooking,
  firstBookedAt,
  lastBookedAt,
}: StudentLastBookingCardProps) {
  const theme = useTheme()
  const { startTime, endTime, status, event, team, host } = latestBooking

  const hostInitials = `${host.firstName[0]}${host.lastName[0]}`.toUpperCase()

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight={700}>
            Last Booking
          </Typography>
          <BookingStatusBadge status={status} />
        </Stack>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow
              icon={<BookOpen size={16} />}
              label="Event"
              value={
                <Typography variant="body2" fontWeight={600}>
                  {toTitleCase(event.name)}
                </Typography>
              }
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow
              icon={<Users size={16} />}
              label="Team"
              value={
                <Typography variant="body2" fontWeight={600}>
                  {toTitleCase(team.name)}
                </Typography>
              }
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow
              icon={<Calendar size={16} />}
              label="Date"
              value={
                <Typography variant="body2" fontWeight={600}>
                  {format(new Date(startTime), 'MMM d, yyyy')}
                </Typography>
              }
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <InfoRow
              icon={<Clock size={16} />}
              label="Time"
              value={
                <Typography variant="body2" fontWeight={600}>
                  {format(new Date(startTime), 'h:mm a')} – {format(new Date(endTime), 'h:mm a')}
                </Typography>
              }
            />
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              src={host.avatarUrl ?? undefined}
              sx={{
                width: 36,
                height: 36,
                fontSize: '0.8rem',
                fontWeight: 700,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: theme.palette.primary.main,
              }}
            >
              {hostInitials}
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}
              >
                Host
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {toTitleCase(`${host.firstName} ${host.lastName}`)}
              </Typography>
            </Box>
          </Stack>

          <Stack direction={{ xs: 'row', sm: 'row' }} spacing={4}>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}
              >
                First Booking
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {firstBookedAt ? format(new Date(firstBookedAt), 'MMM d, yyyy') : 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}
              >
                Last Booking
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {lastBookedAt ? format(new Date(lastBookedAt), 'MMM d, yyyy') : 'N/A'}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

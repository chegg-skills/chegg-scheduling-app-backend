import { Box, Card, Typography, Grid, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Calendar, History, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { StudentSummary } from '@/types'

interface StudentProfileCardProps {
  student: StudentSummary
}

export function StudentProfileCard({ student }: StudentProfileCardProps) {
  const theme = useTheme()

  const stats = [
    {
      label: 'Total Bookings',
      value: student.bookingCount,
      icon: <History size={20} />,
      color: theme.palette.primary.main,
    },
    {
      label: 'First Booking',
      value: student.firstBookedAt ? format(new Date(student.firstBookedAt), 'MMM d, yyyy') : 'N/A',
      icon: <Clock size={20} />,
      color: theme.palette.secondary.main,
    },
    {
      label: 'Last Booking',
      value: student.lastBookedAt ? format(new Date(student.lastBookedAt), 'MMM d, yyyy') : 'N/A',
      icon: <Calendar size={20} />,
      color: theme.palette.info.main,
    },
  ]

  return (
    <Card variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: alpha(stat.color, 0.08),
                  color: stat.color,
                  display: 'flex',
                }}
              >
                {stat.icon}
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  {stat.label}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {stat.value}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Card>
  )
}

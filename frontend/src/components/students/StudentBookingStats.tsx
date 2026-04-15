import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { CalendarDays, CheckCircle, XCircle, UserX } from 'lucide-react'
import { StatCard } from '@/components/shared/StatCard'
import type { Booking } from '@/types'

interface StudentBookingStatsProps {
  bookings: Booking[]
  totalCount: number
}

export function StudentBookingStats({ bookings, totalCount }: StudentBookingStatsProps) {
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length
  const noShow = bookings.filter((b) => b.status === 'NO_SHOW').length
  const cancelled = bookings.filter((b) => b.status === 'CANCELLED').length

  const stats = [
    {
      label: 'Total Bookings',
      value: totalCount,
      helperText: 'All sessions booked',
      icon: <CalendarDays size={22} />,
      accent: 'orange' as const,
    },
    {
      label: 'Sessions Joined',
      value: completed,
      helperText: 'Completed sessions',
      icon: <CheckCircle size={22} />,
      accent: 'green' as const,
    },
    {
      label: 'No Show',
      value: noShow,
      helperText: 'Missed without cancelling',
      icon: <UserX size={22} />,
      accent: 'purple' as const,
    },
    {
      label: 'Cancelled',
      value: cancelled,
      helperText: 'Sessions cancelled',
      icon: <XCircle size={22} />,
      accent: 'teal' as const,
    },
  ]

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        backgroundColor: 'background.paper',
        borderColor: 'divider',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 3 }}>
          Analytics
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </Box>
      </CardContent>
    </Card>
  )
}

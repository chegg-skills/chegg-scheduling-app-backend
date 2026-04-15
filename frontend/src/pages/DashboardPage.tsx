import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, UsersRound, CalendarDays, Layers, ArrowLeftRight, Clock3 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useDashboardStats } from '@/hooks/useStats'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import type { StatsTimeframe } from '@/types'

type QuickLink = {
  label: string
  to: string
  icon: React.ReactNode
  roles: string[]
}

const QUICK_LINKS: QuickLink[] = [
  {
    label: 'Users',
    to: '/users',
    icon: <Users size={24} />,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Teams',
    to: '/teams',
    icon: <UsersRound size={24} />,
    roles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    label: 'Events',
    to: '/events',
    icon: <CalendarDays size={24} />,
    roles: ['SUPER_ADMIN', 'TEAM_ADMIN'],
  },
  {
    label: 'Offerings',
    to: '/event-offerings',
    icon: <Layers size={24} />,
    roles: ['SUPER_ADMIN'],
  },
  {
    label: 'Interaction Types',
    to: '/interaction-types',
    icon: <ArrowLeftRight size={24} />,
    roles: ['SUPER_ADMIN'],
  },
]

export function DashboardPage() {
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('month')
  const { data: dashboardStats, isLoading: statsLoading } = useDashboardStats(timeframe)

  const visibleLinks = QUICK_LINKS.filter((l) => user && l.roles.includes(user.role))

  const dashboardCards = [
    {
      label: 'Scheduled bookings',
      value: dashboardStats?.metrics.scheduledBookings ?? 0,
      helperText: 'Sessions inside the selected time frame',
      icon: <CalendarDays size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Upcoming bookings',
      value: dashboardStats?.metrics.upcomingBookings ?? 0,
      helperText: 'Confirmed sessions still ahead',
      icon: <Clock3 size={18} />,
      accent: 'teal' as const,
    },
    {
      label: 'Active users',
      value: dashboardStats?.metrics.activeUsers ?? 0,
      helperText: 'Users currently enabled in the app',
      icon: <Users size={18} />,
      accent: 'purple' as const,
    },
    {
      label: user?.role === 'COACH' ? 'Active teams' : 'Active events',
      value:
        user?.role === 'COACH'
          ? (dashboardStats?.metrics.activeTeams ?? 0)
          : (dashboardStats?.metrics.activeEvents ?? 0),
      helperText:
        user?.role === 'COACH'
          ? 'Teams connected to your hosted events'
          : 'Bookable events currently enabled',
      icon: user?.role === 'COACH' ? <UsersRound size={18} /> : <Layers size={18} />,
      accent: 'green' as const,
    },
  ]

  return (
    <Box>
      <PageHeader
        title={`Welcome back${user ? `, ${user.firstName}` : ''}!`}
        subtitle={user ? `Signed in as ${user.email} · ${user.role.replace('_', ' ')}` : undefined}
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={dashboardStats?.timeframe}
          items={dashboardCards}
          isLoading={statsLoading}
        />

        <DashboardCharts timeframe={timeframe} />

        {visibleLinks.length > 0 && (
          <Box sx={{ mt: 6, mb: 3 }}>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'text.secondary',
                textTransform: 'uppercase',
                display: 'block',
                mb: 1,
              }}
            >
              Quick Links
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))',
                },
              }}
            >
              {visibleLinks.map((link) => (
                <Card
                  key={link.to + link.label}
                  variant="outlined"
                  sx={{
                    borderRadius: 1.5, // 12px
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  <CardActionArea component={Link} to={link.to} sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          display: 'flex',
                        }}
                      >
                        {link.icon}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {link.label}
                      </Typography>
                    </Stack>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

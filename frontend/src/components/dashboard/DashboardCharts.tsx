import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import { format, parseISO } from 'date-fns'
import { useBookingTrends, useTeamPerformance, usePeakActivity } from '@/hooks/queries/useStats'
import type { StatsTimeframe, PeakActivityMetric } from '@/types'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { BookingVolumeTrendChart } from './charts/BookingVolumeTrendChart'
import { SessionOutcomesChart } from './charts/SessionOutcomesChart'
import { TeamPerformanceChart } from './charts/TeamPerformanceChart'
import { PeakActivityChart } from './charts/PeakActivityChart'

interface DashboardChartsProps {
  timeframe: StatsTimeframe
}

export function DashboardCharts({ timeframe }: DashboardChartsProps) {
  const { data: trendsData, isLoading: trendsLoading, error: trendsError } = useBookingTrends(timeframe)
  const { data: teamData, isLoading: teamLoading, error: teamError } = useTeamPerformance(timeframe)
  const { data: peakData, isLoading: peakLoading, error: peakError } = usePeakActivity(timeframe)

  const chartData = useMemo(() => {
    if (!trendsData?.metrics.trends) return []
    return trendsData.metrics.trends.map((t) => ({
      ...t,
      displayDate: format(parseISO(t.date), 'MMM d'),
    }))
  }, [trendsData])

  const performanceData = useMemo(() => {
    return teamData?.metrics.performance || []
  }, [teamData])

  const activityData = useMemo(() => {
    if (!peakData?.metrics.activity) return []
    return peakData.metrics.activity.map((a: PeakActivityMetric) => ({
      ...a,
      displayHour: `${a.hour % 12 || 12}${a.hour >= 12 ? 'PM' : 'AM'}`,
    }))
  }, [peakData])

  if (trendsError || teamError || peakError) {
    return (
      <Box sx={{ mt: 4 }}>
        <ErrorAlert message="Failed to load dashboard charts. Please refresh the page." />
      </Box>
    )
  }

  if (trendsLoading || teamLoading || peakLoading) {
    return (
      <Box sx={{ mt: 4 }}>
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
          }}
        >
          <Box sx={{ gridColumn: { lg: 'span 8' } }}>
            <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
          </Box>
          <Box sx={{ gridColumn: { lg: 'span 4' } }}>
            <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
          </Box>
          <Box sx={{ gridColumn: { lg: 'span 6' } }}>
            <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
          </Box>
          <Box sx={{ gridColumn: { lg: 'span 6' } }}>
            <Skeleton variant="rectangular" height={380} sx={{ borderRadius: 2 }} />
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ mt: 5 }}>
      <Typography
        variant="overline"
        sx={{
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: 'text.secondary',
          textTransform: 'uppercase',
          display: 'block',
          mb: 2,
        }}
      >
        Performance & Trends
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' },
        }}
      >
        <Box sx={{ gridColumn: { lg: 'span 8' } }}>
          <BookingVolumeTrendChart chartData={chartData} />
        </Box>
        <Box sx={{ gridColumn: { lg: 'span 4' } }}>
          <SessionOutcomesChart chartData={chartData} />
        </Box>
        <Box sx={{ gridColumn: { lg: 'span 6' } }}>
          <TeamPerformanceChart performanceData={performanceData} />
        </Box>
        <Box sx={{ gridColumn: { lg: 'span 6' } }}>
          <PeakActivityChart activityData={activityData} />
        </Box>
      </Box>
    </Box>
  )
}

import Box from '@mui/material/Box'
import { alpha } from '@mui/material/styles'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { CalendarRange } from 'lucide-react'
import { StatCard, type StatCardProps } from './StatCard'
import type { StatsTimeframe, StatsTimeframeInfo } from '@/types'
import Button from '@mui/material/Button'
import { useState } from 'react'
import { DateFilterModal } from './form/DateFilterModal'

interface StatsOverviewProps {
  timeframe: StatsTimeframe
  onTimeframeChange: (value: StatsTimeframe) => void
  timeframeInfo?: StatsTimeframeInfo
  items: StatCardProps[]
  isLoading?: boolean
}

export function StatsOverview({
  timeframe,
  onTimeframeChange,
  timeframeInfo,
  items,
  isLoading = false,
  title = 'Analytics',
}: StatsOverviewProps & { title?: string }) {
  const [modalOpen, setModalOpen] = useState(false)
  const cardCount = Math.max(items.length, 4)

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 4,
        mt: 2,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        borderColor: 'divider',
        boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {title}
            </Typography>
            {timeframeInfo?.rangeLabel && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Period: {timeframeInfo.rangeLabel}
              </Typography>
            )}
          </Box>

          <Button
            variant="contained"
            color="inherit"
            onClick={() => setModalOpen(true)}
            startIcon={<CalendarRange size={16} />}
            sx={{
              height: 38,
              px: 2.5,
              borderRadius: 2,
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
              '&:hover': {
                backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
              },
            }}
          >
            {timeframeInfo?.label ?? 'Select Date Range'}
          </Button>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {isLoading && !timeframeInfo
            ? Array.from({ length: cardCount }).map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    borderRadius: 1.2,
                    border: 1,
                    borderColor: 'divider',
                    backgroundColor: '#fff',
                  }}
                >
                  <Skeleton variant="text" width="40%" height={20} />
                  <Skeleton variant="text" width="55%" height={42} />
                  <Skeleton variant="text" width="85%" height={18} />
                </Box>
              ))
            : items.map((item) => <StatCard key={item.label} {...item} />)}
        </Box>
      </CardContent>

      <DateFilterModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentValue={timeframe}
        onChange={onTimeframeChange}
      />
    </Card>
  )
}

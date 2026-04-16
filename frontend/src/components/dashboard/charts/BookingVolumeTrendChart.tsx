import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartHeader } from './ChartHeader'
import { COLORS } from './chartColors'

interface ChartDataPoint {
  displayDate: string
  count: number
  completed: number
  noShow: number
  cancelled: number
}

interface BookingVolumeTrendChartProps {
  chartData: ChartDataPoint[]
}

export function BookingVolumeTrendChart({ chartData }: BookingVolumeTrendChartProps) {
  return (
    <Card
      variant="outlined"
      sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', height: '100%', minHeight: 380 }}
    >
      <ChartHeader
        title="Daily Booking Volume"
        description="Shows the total number of sessions scheduled each day within the selected timeframe. Ideal for tracking system growth and seasonal spikes."
      />
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} />
                <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="displayDate"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#525252' }}
              dy={10}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#525252' }} />
            <ChartTooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Total Bookings"
              stroke={COLORS.primary}
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  )
}

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

interface ActivityDataPoint {
  displayHour: string
  count: number
}

interface PeakActivityChartProps {
  activityData: ActivityDataPoint[]
}

export function PeakActivityChart({ activityData }: PeakActivityChartProps) {
  return (
    <Card
      variant="outlined"
      sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', height: '100%', minHeight: 380 }}
    >
      <ChartHeader
        title="Peak Hourly Activity"
        description="Identifies system-wide usage patterns by hour of day. Use this to optimize staffing and ensure coach availability during high-demand windows."
      />
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={activityData}>
            <defs>
              <linearGradient id="colorPeak" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.1} />
                <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="displayHour"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#525252' }}
              interval={2}
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
              type="stepAfter"
              dataKey="count"
              name="Bookings"
              stroke={COLORS.secondary}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorPeak)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  )
}

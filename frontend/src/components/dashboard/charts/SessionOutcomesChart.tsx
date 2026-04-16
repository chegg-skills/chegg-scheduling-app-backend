import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
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

interface SessionOutcomesChartProps {
  chartData: ChartDataPoint[]
}

export function SessionOutcomesChart({ chartData }: SessionOutcomesChartProps) {
  return (
    <Card
      variant="outlined"
      sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', height: '100%', minHeight: 380 }}
    >
      <ChartHeader
        title="Session Outcomes"
        description="Displays the status distribution of all sessions. High completion rates indicate system health, while excessive cancellations may suggest scheduling issues."
      />
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={chartData}>
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
            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="completed" name="Completed" stackId="a" fill={COLORS.completed} />
            <Bar dataKey="noShow" name="No-Show" stackId="a" fill={COLORS.noShow} />
            <Bar dataKey="cancelled" name="Cancelled" stackId="a" fill={COLORS.cancelled} />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  )
}

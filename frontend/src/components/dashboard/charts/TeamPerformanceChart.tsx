import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartHeader } from './ChartHeader'
import { COLORS } from './chartColors'

interface PerformanceDataPoint {
  name: string
  completed: number
  total: number
}

interface TeamPerformanceChartProps {
  performanceData: PerformanceDataPoint[]
}

export function TeamPerformanceChart({ performanceData }: TeamPerformanceChartProps) {
  return (
    <Card
      variant="outlined"
      sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', height: '100%', minHeight: 380 }}
    >
      <ChartHeader
        title="Team Performance Benchmark"
        description="Compares different teams based on successful session completion. Used to identify top-performing teams and those needing additional support."
      />
      <Box sx={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={performanceData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fontWeight: 500 }}
              width={100}
            />
            <ChartTooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            />
            <Bar
              dataKey="completed"
              name="Completed"
              stackId="team"
              fill={COLORS.completed}
              radius={[0, 4, 4, 0]}
            />
            <Bar
              dataKey="total"
              name="Total Attempts"
              stackId="team_hide"
              fill={COLORS.secondary}
              opacity={0.1}
              hide
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Card>
  )
}

import { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as ChartTooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Info } from 'lucide-react';
import { useBookingTrends, useTeamPerformance, usePeakActivity } from '@/hooks/useStats';
import type { StatsTimeframe, PeakActivityMetric } from '@/types';

interface DashboardChartsProps {
    timeframe: StatsTimeframe;
}

const COLORS = {
    primary: '#FF7500', // Chegg Orange
    secondary: '#00253C', // Chegg Navy
    completed: '#10B981', // Emerald
    cancelled: '#EF4444', // Red
    noShow: '#6B7280', // Gray
    planned: '#3B82F6', // Blue
};

const ChartHeader = ({ title, description }: { title: string; description: string }) => (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
        </Typography>
        <Tooltip title={description} arrow placement="top">
            <IconButton size="small" sx={{ color: 'text.secondary', p: 0.5, '&:hover': { color: COLORS.primary } }}>
                <Info size={16} />
            </IconButton>
        </Tooltip>
    </Stack>
);

export function DashboardCharts({ timeframe }: DashboardChartsProps) {
    const { data: trendsData, isLoading: trendsLoading } = useBookingTrends(timeframe);
    const { data: teamData, isLoading: teamLoading } = useTeamPerformance(timeframe);
    const { data: peakData, isLoading: peakLoading } = usePeakActivity(timeframe);

    const chartData = useMemo(() => {
        if (!trendsData?.metrics.trends) return [];
        return trendsData.metrics.trends.map((t) => ({
            ...t,
            displayDate: format(parseISO(t.date), 'MMM d'),
        }));
    }, [trendsData]);

    const performanceData = useMemo(() => {
        return teamData?.metrics.performance || [];
    }, [teamData]);

    const activityData = useMemo(() => {
        if (!peakData?.metrics.activity) return [];
        return peakData.metrics.activity.map((a: PeakActivityMetric) => ({
            ...a,
            displayHour: `${a.hour % 12 || 12}${a.hour >= 12 ? 'PM' : 'AM'}`
        }));
    }, [peakData]);


    if (trendsLoading || teamLoading || peakLoading) {
        return (
            <Box sx={{ mt: 4 }}>
                <Box
                    sx={{
                        display: 'grid',
                        gap: 3,
                        gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' }
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
        );
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
                    gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, 1fr)' }
                }}
            >
                {/* Booking Volume Trend */}
                <Box sx={{ gridColumn: { lg: 'span 8' } }}>
                    <Card
                        variant="outlined"
                        sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            height: '100%',
                            minHeight: 380,
                        }}
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
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                    />
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
                </Box>

                {/* Status Distribution */}
                <Box sx={{ gridColumn: { lg: 'span 4' } }}>
                    <Card
                        variant="outlined"
                        sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            height: '100%',
                            minHeight: 380,
                        }}
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
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                    />
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
                </Box>

                {/* Team Performance Performance */}
                <Box sx={{ gridColumn: { lg: 'span 6' } }}>
                    <Card
                        variant="outlined"
                        sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            height: '100%',
                            minHeight: 380,
                        }}
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
                                    <Bar dataKey="completed" name="Completed" stackId="team" fill={COLORS.completed} radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="total" name="Total Attempts" stackId="team_hide" fill={COLORS.secondary} opacity={0.1} hide />
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Card>
                </Box>

                {/* Peak Activity Chart */}
                <Box sx={{ gridColumn: { lg: 'span 6' } }}>
                    <Card
                        variant="outlined"
                        sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: 'background.paper',
                            height: '100%',
                            minHeight: 380,
                        }}
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
                                        tick={{ fontSize: 10, fill: '#6B7280' }}
                                        interval={2}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                    />
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
                </Box>
            </Box>
        </Box>
    );
}

import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { useState, useMemo } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Search, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { BookingTable } from '@/components/bookings/BookingTable'
import { useBookings } from '@/hooks/useBookings'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { Input } from '@/components/shared/Input'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useBookingStats } from '@/hooks/useStats'
import type { BookingStatus, StatsTimeframe } from '@/types'

type FilterType = 'UPCOMING' | 'ALL' | BookingStatus

export function BookingsPage() {
    const [filter, setFilter] = useState<FilterType>('UPCOMING')
    const [searchInput, setSearchInput] = useState('')
    const [viewingUserId, setViewingUserId] = useState<string | null>(null)
    const [timeframe, setTimeframe] = useState<StatsTimeframe>('month')
    const debouncedSearch = useDebouncedValue(searchInput, 250)

    const { data: bookingStats, isLoading: statsLoading } = useBookingStats(timeframe)

    // Keep "Upcoming" filtering client-side. Search is server-driven for scalability.
    const { data: bookings = [], isLoading, error } = useBookings({
        search: debouncedSearch.trim() || undefined,
    })

    const filteredBookings = useMemo(() => {
        const now = new Date()
        return bookings.filter(b => {
            const startTime = new Date(b.startTime)

            if (filter === 'UPCOMING') {
                return b.status === 'CONFIRMED' && startTime >= now
            }
            if (filter === 'ALL') return true
            return b.status === filter
        }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    }, [bookings, filter])

    const handleTabChange = (_: React.SyntheticEvent, newValue: FilterType) => {
        setFilter(newValue)
    }

    const bookingStatItems = [
        {
            label: 'Scheduled',
            value: bookingStats?.metrics.totalBookings ?? 0,
            helperText: 'Bookings inside the selected time frame',
            icon: <CalendarDays size={18} />,
            accent: 'orange' as const,
        },
        {
            label: 'Upcoming',
            value: bookingStats?.metrics.upcomingBookings ?? 0,
            helperText: 'Confirmed sessions still ahead',
            icon: <Clock3 size={18} />,
            accent: 'teal' as const,
        },
        {
            label: 'Top Coach',
            value: bookingStats?.metrics.mostBookedCoach?.name ?? 'N/A',
            helperText: bookingStats?.metrics.mostBookedCoach ? `${bookingStats.metrics.mostBookedCoach.count} bookings assigned` : 'No coach metrics',
            icon: <CheckCircle2 size={18} />,
            accent: 'purple' as const,
        },
        {
            label: 'Top Team',
            value: bookingStats?.metrics.mostBookedTeam?.name ?? 'N/A',
            helperText: bookingStats?.metrics.mostBookedTeam ? `${bookingStats.metrics.mostBookedTeam.count} team bookings` : 'No team metrics',
            icon: <CalendarDays size={18} />,
            accent: 'green' as const,
        },
    ]

    return (
        <Box>
            <PageHeader
                title="Bookings"
                subtitle="Manage your scheduled sessions and meetings"
                actions={
                    <Box sx={{ width: { xs: '100%', sm: 420 }, maxWidth: 420 }}>
                        <Input
                            isSearch
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search by name, email, or booking ID"
                            aria-label="Search bookings"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search size={16} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchInput ? (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="Clear search"
                                            edge="end"
                                            size="small"
                                            onClick={() => setSearchInput('')}
                                        >
                                            <X size={14} />
                                        </IconButton>
                                    </InputAdornment>
                                ) : undefined,
                            }}
                        />
                    </Box>
                }
            />

            <Box sx={{ px: { xs: 2.5, md: 4 } }}>
                <StatsOverview
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                    timeframeInfo={bookingStats?.timeframe}
                    items={bookingStatItems}
                    isLoading={statsLoading}
                />

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        mt: 2,
                        mb: 3,
                    }}
                >
                    <Tabs
                        value={filter}
                        onChange={handleTabChange}
                        aria-label="booking filters"
                        sx={{
                            '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                minHeight: 48,
                            },
                            '& .MuiTabs-indicator': {
                                height: 3,
                                borderRadius: '3px 3px 0 0',
                            },
                        }}
                    >
                        <Tab
                            label="Upcoming"
                            value="UPCOMING"
                            icon={<Clock3 size={18} />}
                            iconPosition="start"
                        />
                        <Tab
                            label="All"
                            value="ALL"
                            icon={<CalendarDays size={18} />}
                            iconPosition="start"
                        />
                        <Tab
                            label="Cancelled"
                            value="CANCELLED"
                            icon={<X size={18} />}
                            iconPosition="start"
                        />
                        <Tab
                            label="Completed"
                            value="COMPLETED"
                            icon={<CheckCircle2 size={18} />}
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                {isLoading && bookings.length === 0 ? (
                    <PageSpinner />
                ) : error ? (
                    <ErrorAlert message="Failed to load bookings. Please try again." />
                ) : (
                    <Box>
                        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2" color="text.secondary">
                                Showing {filteredBookings.length} bookings
                            </Typography>
                        </Box>
                        <BookingTable bookings={filteredBookings} onViewHost={setViewingUserId} />
                    </Box>
                )}

                {viewingUserId && (
                    <UserDetailModal
                        userId={viewingUserId}
                        onClose={() => setViewingUserId(null)}
                    />
                )}
            </Box>
        </Box>
    )
}

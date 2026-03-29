import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { BookingTable } from '@/components/bookings/BookingTable'
import { useBookings } from '@/hooks/useBookings'
import type { BookingStatus } from '@/types'

type FilterType = 'UPCOMING' | 'ALL' | BookingStatus

export function BookingsPage() {
    const [filter, setFilter] = useState<FilterType>('UPCOMING')

    // Fetch all bookings for now, and filter client-side for "Upcoming" 
    // since the backend doesn't have a specific "upcoming" filter yet.
    const { data: bookings = [], isLoading, error } = useBookings()

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

    return (
        <Box>
            <PageHeader
                title="Bookings"
                subtitle="Manage your scheduled sessions and meetings"
            />

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={filter} onChange={handleTabChange} aria-label="booking filters">
                    <Tab label="Upcoming" value="UPCOMING" />
                    <Tab label="All" value="ALL" />
                    <Tab label="Cancelled" value="CANCELLED" />
                    <Tab label="Completed" value="COMPLETED" />
                </Tabs>
            </Box>

            {isLoading ? (
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
                    <BookingTable bookings={filteredBookings} />
                </Box>
            )}
        </Box>
    )
}

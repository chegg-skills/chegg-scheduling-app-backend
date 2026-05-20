import { useState, useMemo } from 'react'
import { Stack, Box, Tabs, Tab, Typography } from '@mui/material'
import { Clock3, CalendarDays, X, CheckCircle2 } from 'lucide-react'
import { useBookings } from '@/hooks/queries/useBookings'
import { BookingTable } from '@/components/bookings/BookingTable'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import type { BookingStatus } from '@/types'

interface EventBookingListProps {
  eventId: string
}

type FilterType = 'UPCOMING' | 'ALL' | 'CANCELLED' | 'COMPLETED'

export function EventBookingList({ eventId }: EventBookingListProps) {
  const [statusFilter, setStatusFilter] = useState<FilterType>('UPCOMING')
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    eventId,
  })

  // Prepare server filters based on status selection
  const serverFilters = useMemo(
    () => ({
      ...params,
      status:
        statusFilter === 'UPCOMING'
          ? ('CONFIRMED' as BookingStatus)
          : statusFilter === 'ALL'
            ? undefined
            : (statusFilter as BookingStatus),
    }),
    [params, statusFilter]
  )

  const { data, isLoading, error } = useBookings(serverFilters)

  // Frontend filtering for UPCOMING (Confirmed + Future-dated)
  const filteredBookings = useMemo(() => {
    const bookings = data?.bookings ?? []
    if (statusFilter === 'UPCOMING') {
      const now = new Date()
      return bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.startTime) >= now)
    }
    return bookings
  }, [data?.bookings, statusFilter])

  const handleTabChange = (_: React.SyntheticEvent, newValue: FilterType) => {
    setStatusFilter(newValue)
    setParams((p) => ({ ...p, page: 1 }))
  }

  if (isLoading && !data) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load event bookings." />

  const pagination = data?.pagination

  return (
    <Stack spacing={3}>
      <SectionHeader
        title="Bookings"
        description="View and manage bookings and co-coach assignments for this event."
      />

      <Box
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          mb: 1,
        }}
      >
        <Tabs
          value={statusFilter}
          onChange={handleTabChange}
          aria-label="event booking filters"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: 48,
            },
          }}
        >
          <Tab
            label="Upcoming"
            value="UPCOMING"
            icon={<Clock3 size={18} />}
            iconPosition="start"
          />
          <Tab label="All" value="ALL" icon={<CalendarDays size={18} />} iconPosition="start" />
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

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1,
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Showing {pagination?.total ?? filteredBookings.length} bookings
        </Typography>
      </Box>

      <BookingTable
        bookings={filteredBookings}
        pagination={pagination}
        onPageChange={(page) => setParams((p) => ({ ...p, page }))}
        onRowsPerPageChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
      />
    </Stack>
  )
}

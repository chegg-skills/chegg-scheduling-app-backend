import { useState, useMemo } from 'react'
import { Stack, Box, Tabs, Tab, Typography } from '@mui/material'
import { Clock3, CalendarDays, X, CheckCircle2 } from 'lucide-react'
import { useBookings } from '@/hooks/queries/useBookings'
import { BookingTable } from '@/components/bookings/BookingTable'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
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
  // Captured once per mount: an inline new Date() would mint a fresh ms-precision
  // query key on every tab switch, so React Query could never reuse a cached page.
  const [upcomingSince] = useState(() => new Date().toISOString())

  // Prepare server filters based on status selection.
  // UPCOMING asks the server for future bookings soonest-first — without startDate +
  // sortOrder, a page of 10 would contain the FARTHEST-future sessions, so the soonest
  // ones wouldn't even be in the response. The server owns the filtering; re-filtering
  // client-side would desynchronize visible rows from pagination.total.
  const serverFilters = useMemo(
    () => ({
      ...params,
      status:
        statusFilter === 'UPCOMING'
          ? ('CONFIRMED' as BookingStatus)
          : statusFilter === 'ALL'
            ? undefined
            : (statusFilter as BookingStatus),
      ...(statusFilter === 'UPCOMING' && {
        sortOrder: 'asc' as const,
        startDate: upcomingSince,
      }),
    }),
    [params, statusFilter, upcomingSince]
  )

  const { data, isLoading, error } = useBookings(serverFilters)
  const bookings = data?.bookings ?? []

  const handleTabChange = (_: React.SyntheticEvent, newValue: FilterType) => {
    setStatusFilter(newValue)
    setParams((p) => ({ ...p, page: 1 }))
  }

  if (isLoading && !data) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load event bookings." />

  const pagination = data?.pagination

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          flexDirection: { xs: 'column', md: 'row' },
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 0,
          mb: 1,
          gap: { xs: 2, md: 0 },
        }}
      >
        <Box sx={{ pb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Bookings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage bookings and co-coach assignments for this event.
          </Typography>
        </Box>

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
          <Tab label="Upcoming" value="UPCOMING" icon={<Clock3 size={18} />} iconPosition="start" />
          <Tab label="All" value="ALL" icon={<CalendarDays size={18} />} iconPosition="start" />
          <Tab label="Cancelled" value="CANCELLED" icon={<X size={18} />} iconPosition="start" />
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
          Showing {pagination?.total ?? bookings.length} bookings
        </Typography>
      </Box>

      <BookingTable
        bookings={bookings}
        pagination={pagination}
        onPageChange={(page) => setParams((p) => ({ ...p, page }))}
        onRowsPerPageChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
      />
    </Stack>
  )
}

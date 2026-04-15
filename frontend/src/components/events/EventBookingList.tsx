import { useState, useMemo } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { useBookings } from '@/hooks/useBookings'
import { BookingTable } from '@/components/bookings/BookingTable'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import type { BookingStatus } from '@/types'

interface EventBookingListProps {
  eventId: string
  onViewHost?: (userId: string) => void
}

export function EventBookingList({ eventId, onViewHost }: EventBookingListProps) {
  const [params, setParams] = useState({
    page: 1,
    limit: 10,
    eventId,
  })

  // Prepare server filters for upcoming confirmed sessions
  const serverFilters = useMemo(
    () => ({
      ...params,
      status: 'CONFIRMED' as BookingStatus,
    }),
    [params]
  )

  const { data, isLoading, error } = useBookings(serverFilters)

  // Frontend filtering for UPCOMING (Confirmed + Future-dated)
  const upcomingBookings = useMemo(() => {
    const bookings = data?.bookings ?? []
    const now = new Date()
    return bookings.filter((b) => {
      const startTime = new Date(b.startTime)
      return b.status === 'CONFIRMED' && startTime >= now
    })
  }, [data?.bookings])

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load session bookings." />

  const pagination = data?.pagination

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Upcoming Sessions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View future sessions and co-host assignments for this event.
          </Typography>
        </Box>
      </Box>

      <BookingTable
        bookings={upcomingBookings}
        pagination={pagination}
        onPageChange={(page) => setParams((p) => ({ ...p, page }))}
        onRowsPerPageChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
        onViewHost={onViewHost}
      />
    </Stack>
  )
}

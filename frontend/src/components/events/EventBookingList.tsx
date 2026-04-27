import { useState, useMemo } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import { useBookings } from '@/hooks/queries/useBookings'
import { BookingTable } from '@/components/bookings/BookingTable'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import type { BookingStatus } from '@/types'

interface EventBookingListProps {
  eventId: string
}

export function EventBookingList({ eventId }: EventBookingListProps) {
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
  if (error) return <ErrorAlert message="Failed to load event bookings." />

  const pagination = data?.pagination

  return (
    <Stack spacing={3}>
      <SectionHeader 
        title="Upcoming Bookings" 
        description="View future bookings and co-coach assignments for this event."
      />

      <BookingTable
        bookings={upcomingBookings}
        pagination={pagination}
        onPageChange={(page) => setParams((p) => ({ ...p, page }))}
        onRowsPerPageChange={(limit) => setParams((p) => ({ ...p, limit, page: 1 }))}
      />
    </Stack>
  )
}

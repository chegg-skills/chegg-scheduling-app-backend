import { Stack, Typography, Box } from '@mui/material'
import type { Booking } from '@/types'
import { BookingTable } from '@/components/bookings/BookingTable'

interface StudentBookingHistoryProps {
  bookings: Booking[]
}

export function StudentBookingHistory({ bookings }: StudentBookingHistoryProps) {
  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" fontWeight={700}>
          Booking History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bookings.length} Sessions total
        </Typography>
      </Box>

      <BookingTable bookings={bookings} />
    </Stack>
  )
}

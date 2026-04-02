import { useState } from 'react'
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import type { Booking } from '@/types'
import { useUpdateBookingStatus } from '@/hooks/useBookings'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { BookingTableRow } from './BookingTableRow'

interface Props {
  bookings: Booking[]
}

type BookingSortKey = 'student' | 'event' | 'host' | 'date' | 'status'

const bookingSortAccessors: SortAccessorMap<Booking, BookingSortKey> = {
  student: (booking) => booking.studentName,
  event: (booking) => booking.event?.name ?? '',
  host: (booking) => booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : '',
  date: (booking) => new Date(booking.startTime),
  status: (booking) => booking.status,
}

export function BookingTable({ bookings }: Props) {
  const { mutate: updateStatus } = useUpdateBookingStatus()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { sortedItems: sortedBookings, sortConfig, requestSort } = useTableSort(bookings, bookingSortAccessors)

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  if (bookings.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: 8,
          textAlign: 'center',
          borderRadius: 3,
          borderStyle: 'dashed',
          bgcolor: 'transparent',
        }}
      >
        <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
          No bookings scheduled yet.
        </Typography>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            {[
              { label: 'Student', sortKey: 'student' as const, width: '25%' },
              { label: 'Event', sortKey: 'event' as const, width: '20%' },
              { label: 'Host', sortKey: 'host' as const, width: '20%' },
              { label: 'Date / Time', sortKey: 'date' as const, width: '20%' },
              { label: 'Status', sortKey: 'status' as const, width: '15%' },
            ].map((col) => (
              <SortableHeaderCell
                key={col.sortKey}
                label={col.label}
                sortKey={col.sortKey}
                activeSortKey={sortConfig?.key ?? null}
                direction={sortConfig?.direction ?? 'asc'}
                onSort={requestSort}
                width={col.width}
              />
            ))}
            <TableCell
              align="right"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'text.secondary',
                letterSpacing: '0.05em',
                width: 50,
                pr: 3,
              }}
            >
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedBookings.map((booking) => (
            <BookingTableRow
              key={booking.id}
              booking={booking}
              onUpdateStatus={(id, status) => updateStatus({ id, status })}
              isExpanded={expandedId === booking.id}
              onToggle={() => handleToggle(booking.id)}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

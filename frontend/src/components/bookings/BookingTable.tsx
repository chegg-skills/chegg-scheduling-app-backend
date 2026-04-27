import React, { useState, useCallback, useMemo } from 'react'
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
import type { Booking, Pagination } from '@/types'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { BookingTableRow } from './BookingTableRow'
import { TablePagination } from '@/components/shared/table/TablePagination'

interface Props {
  bookings: Booking[]
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (rowsPerPage: number) => void
}

type BookingSortKey = 'student' | 'event' | 'coach' | 'date' | 'status'

const bookingSortAccessors: SortAccessorMap<Booking, BookingSortKey> = {
  student: (booking) => booking.studentName,
  event: (booking) => booking.event?.name ?? '',
  coach: (booking) => (booking.coach ? `${booking.coach.firstName} ${booking.coach.lastName}` : ''),
  date: (booking) => new Date(booking.startTime),
  status: (booking) => booking.status,
}

const COLUMNS = [
  { label: 'Student', sortKey: 'student' as const, width: '25%' },
  { label: 'Event', sortKey: 'event' as const, width: '20%' },
  { label: 'Coach', sortKey: 'coach' as const, width: '20%' },
  { label: 'Date / Time', sortKey: 'date' as const, width: '20%' },
  { label: 'Status', sortKey: 'status' as const, width: '15%' },
]

const dateHeaderFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

export function BookingTable({
  bookings,
  pagination,
  onPageChange,
  onRowsPerPageChange,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const {
    sortedItems: sortedBookings,
    sortConfig,
    requestSort,
  } = useTableSort(bookings, bookingSortAccessors)

  const groupedBookings = useMemo(() => {
    const groups: { date: string; bookings: Booking[] }[] = []
    let currentGroup: { date: string; bookings: Booking[] } | null = null

    sortedBookings.forEach((booking) => {
      const dateStr = dateHeaderFormatter.format(new Date(booking.startTime))
      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = { date: dateStr, bookings: [] }
        groups.push(currentGroup)
      }
      currentGroup.bookings.push(booking)
    })
    return groups
  }, [sortedBookings])

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  if (bookings.length === 0 && !pagination?.total) {
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
            {COLUMNS.map((col) => (
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
          {groupedBookings.map((group) => (
            <React.Fragment key={group.date}>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell
                  colSpan={6}
                  sx={{
                    py: 1.25,
                    px: 3,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    letterSpacing: '0.08em',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {group.date}
                </TableCell>
              </TableRow>
              {group.bookings.map((booking) => (
                <BookingTableRow
                  key={booking.id}
                  booking={booking}
                  isExpanded={expandedId === booking.id}
                  onToggle={() => handleToggle(booking.id)}
                />
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      {pagination && onPageChange && onRowsPerPageChange && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      )}
    </TableContainer>
  )
}

import React, { useState } from 'react'
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
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { BookingTableRow } from './BookingTableRow'
import { TablePagination } from '@/components/shared/TablePagination'

interface Props {
  bookings: Booking[]
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (rowsPerPage: number) => void
  onViewHost?: (userId: string) => void
}

type BookingSortKey = 'student' | 'event' | 'host' | 'date' | 'status'

const bookingSortAccessors: SortAccessorMap<Booking, BookingSortKey> = {
  student: (booking) => booking.studentName,
  event: (booking) => booking.event?.name ?? '',
  host: (booking) => (booking.host ? `${booking.host.firstName} ${booking.host.lastName}` : ''),
  date: (booking) => new Date(booking.startTime),
  status: (booking) => booking.status,
}

export function BookingTable({
  bookings,
  pagination,
  onPageChange,
  onRowsPerPageChange,
  onViewHost,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const {
    sortedItems: sortedBookings,
    sortConfig,
    requestSort,
  } = useTableSort(bookings, bookingSortAccessors)

  const handleToggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

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
          {(() => {
            let lastDateHeader = ''
            return sortedBookings.map((booking) => {
              const date = new Date(booking.startTime)
              const dateHeader = new Intl.DateTimeFormat('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              }).format(date)

              const showHeader = dateHeader !== lastDateHeader
              lastDateHeader = dateHeader

              return (
                <React.Fragment key={booking.id}>
                  {showHeader && (
                    <TableRow sx={{ bgcolor: 'rgba(0, 0, 0, 0.04)' }}>
                      <TableCell
                        colSpan={6}
                        sx={{
                          py: 1,
                          px: 3,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          textTransform: 'uppercase',
                          color: 'text.secondary',
                          letterSpacing: '0.08em',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {dateHeader}
                      </TableCell>
                    </TableRow>
                  )}
                  <BookingTableRow
                    booking={booking}
                    isExpanded={expandedId === booking.id}
                    onToggle={() => handleToggle(booking.id)}
                    onViewHost={onViewHost}
                  />
                </React.Fragment>
              )
            })
          })()}
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

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
  Card,
  CardContent,
  Stack,
  Box,
} from '@mui/material'
import { CalendarDays } from 'lucide-react'
import type { Booking, Pagination } from '@/types'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { BookingTableRow } from './BookingTableRow'
import { SlotSessionRow } from './SlotSessionRow'
import { TablePagination } from '@/components/shared/table/TablePagination'

interface Props {
  bookings: Booking[]
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (rowsPerPage: number) => void
  disableSlotGrouping?: boolean
}

type BookingSortKey = 'student' | 'event' | 'coach' | 'date' | 'status'

const stickyHeaderStyle = {
  position: 'sticky',
  top: 154,
  zIndex: 8,
  background: (theme: any) =>
    theme.palette.mode === 'dark'
      ? theme.palette.background.paper
      : 'linear-gradient(rgba(232, 113, 0, 0.03), rgba(232, 113, 0, 0.03)), #ffffff',
}

const dateHeaderFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const bookingSortAccessors: SortAccessorMap<Booking, BookingSortKey> = {
  student: (booking) => booking.studentName,
  event: (booking) => booking.event?.name ?? '',
  coach: (booking) => (booking.coach ? `${booking.coach.firstName} ${booking.coach.lastName}` : ''),
  date: (booking) => new Date(booking.startTime),
  status: (booking) => booking.status,
}

const COLUMNS = [
  { label: 'Event', sortKey: 'event' as const, width: '36%' },
  { label: 'Student', sortKey: 'student' as const, width: '22%' },
  { label: 'Coach', sortKey: 'coach' as const, width: '17%' },
  { label: 'Date / Time', sortKey: 'date' as const, width: '20%' },
  { label: 'Status', sortKey: 'status' as const, width: '5%' },
]

export function BookingTable({
  bookings,
  pagination,
  onPageChange,
  onRowsPerPageChange,
  disableSlotGrouping,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const {
    sortedItems: sortedBookings,
    sortConfig,
    requestSort,
  } = useTableSort(bookings, bookingSortAccessors)

  const groupedBookings = useMemo(() => {
    const groups: { date: string; slots: Map<string, Booking[]> }[] = []
    let currentGroup: { date: string; slots: Map<string, Booking[]> } | null = null

    sortedBookings.forEach((booking) => {
      const dateStr = dateHeaderFormatter.format(new Date(booking.startTime))
      if (!currentGroup || currentGroup.date !== dateStr) {
        currentGroup = { date: dateStr, slots: new Map() }
        groups.push(currentGroup)
      }
      const key = disableSlotGrouping ? booking.id : (booking.scheduleSlotId ?? booking.id)
      const existing = currentGroup.slots.get(key)
      if (existing) {
        if (!existing.some((b) => b.id === booking.id)) existing.push(booking)
      } else {
        currentGroup.slots.set(key, [booking])
      }
    })
    return groups
  }, [sortedBookings, disableSlotGrouping])

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  if (bookings.length === 0 && !pagination?.total) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 1.5, borderColor: 'divider' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Stack spacing={2} alignItems="center" justifyContent="center">
            <Box
              sx={{
                p: 2,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                color: 'text.secondary',
                display: 'flex',
              }}
            >
              <CalendarDays size={32} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                No bookings scheduled yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Bookings will appear here once students schedule sessions.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, overflow: 'visible' }}>
      <Table>
        <TableHead>
          <TableRow>
            {COLUMNS.map((col, index) => (
              <SortableHeaderCell
                key={col.sortKey}
                label={col.label}
                sortKey={col.sortKey}
                activeSortKey={sortConfig?.key ?? null}
                direction={sortConfig?.direction ?? 'asc'}
                onSort={requestSort}
                width={col.width}
                sx={{
                  ...stickyHeaderStyle,
                  ...(index === 0 ? { borderTopLeftRadius: '12px' } : {}),
                }}
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
                width: 140,
                pr: 3,
                ...stickyHeaderStyle,
                borderTopRightRadius: '12px',
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
              {[...group.slots].flatMap(([slotKey, slotBookings]) => {
                if (!disableSlotGrouping && slotBookings[0]?.scheduleSlotId) {
                  return [
                    <SlotSessionRow
                      key={slotKey}
                      slotId={slotKey}
                      bookings={slotBookings}
                      isExpanded={expandedId === slotKey}
                      onToggle={() => handleToggle(slotKey)}
                    />
                  ]
                }
                return slotBookings.map((booking) => (
                  <BookingTableRow
                    key={booking.id}
                    booking={booking}
                    isExpanded={expandedId === booking.id}
                    onToggle={() => handleToggle(booking.id)}
                  />
                ))
              })}
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

import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import { useTheme } from '@mui/material/styles'
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  eachDayOfInterval,
  isToday,
  parseISO,
} from 'date-fns'
import type { Booking } from '@/types'

// Sub-components
import { CalendarHeader } from './calendar/CalendarHeader'
import { CalendarGridHeader } from './calendar/CalendarGridHeader'
import { CalendarDayCell } from './calendar/CalendarDayCell'

interface BookingCalendarProps {
  bookings: Booking[]
  onViewDetail?: (booking: Booking) => void
}

export function BookingCalendar({ bookings, onViewDetail }: BookingCalendarProps) {
  const theme = useTheme()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    bookings.forEach((booking) => {
      const dateKey = format(parseISO(booking.startTime), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(booking)
    })
    return map
  }, [bookings])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return theme.palette.success.main
      case 'CANCELLED':
        return theme.palette.error.main
      case 'COMPLETED':
        return theme.palette.info.main
      case 'PENDING':
        return theme.palette.warning.main
      default:
        return theme.palette.text.secondary
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <CalendarHeader
        currentMonth={currentMonth}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onToday={goToToday}
        getStatusColor={getStatusColor}
      />

      <CalendarGridHeader />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          bgcolor: 'divider',
          gap: '1px',
        }}
      >
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayBookings = bookingsByDate[dateKey] || []
          const isCurrentMonth = isSameMonth(day, monthStart)
          const isTodayDate = isToday(day)

          return (
            <CalendarDayCell
              key={dateKey}
              day={day}
              isCurrentMonth={isCurrentMonth}
              isToday={isTodayDate}
              bookings={dayBookings}
              onViewDetail={onViewDetail}
              getStatusColor={getStatusColor}
            />
          )
        })}
      </Box>
    </Paper>
  )
}

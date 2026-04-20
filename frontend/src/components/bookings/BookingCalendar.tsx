import { useMemo, useCallback } from 'react'
import { isSameMonth, format, parseISO } from 'date-fns'
import { useTheme } from '@mui/material/styles'
import type { Booking } from '@/types'

// Shared Calendar Components
import { CalendarLayout, useCalendar } from '@/components/shared/calendar/CalendarLayout'
import { CalendarDayCell } from './calendar/CalendarDayCell'

interface BookingCalendarProps {
  bookings: Booking[]
  onViewDetail?: (booking: Booking) => void
}

export function BookingCalendar({ bookings, onViewDetail }: BookingCalendarProps) {
  const theme = useTheme()
  const {
    currentMonth,
    monthStart,
    calendarDays,
    nextMonth,
    prevMonth,
    goToToday,
  } = useCalendar()

  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {}
    bookings.forEach((booking) => {
      const dateKey = format(parseISO(booking.startTime), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(booking)
    })
    return map
  }, [bookings])

  const getStatusColor = useCallback(
    (status: string) => {
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
    },
    [theme]
  )

  const legends = useMemo(() => [
    { label: 'Confirmed', color: theme.palette.success.main },
    { label: 'Cancelled', color: theme.palette.error.main },
    { label: 'Pending', color: theme.palette.warning.main },
  ], [theme])

  return (
    <CalendarLayout
      currentMonth={currentMonth}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
      onToday={goToToday}
      legends={legends}
    >
      {calendarDays.map((day) => {
        const dateKey = format(day, 'yyyy-MM-dd')
        const dayBookings = bookingsByDate[dateKey] || []
        const isCurrentMonth = isSameMonth(day, monthStart)

        return (
          <CalendarDayCell
            key={dateKey}
            day={day}
            isCurrentMonth={isCurrentMonth}
            isToday={format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
            bookings={dayBookings}
            onViewDetail={onViewDetail}
            getStatusColor={getStatusColor}
          />
        )
      })}
    </CalendarLayout>
  )
}

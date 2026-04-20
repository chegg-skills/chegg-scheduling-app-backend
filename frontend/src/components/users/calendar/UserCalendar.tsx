import { useMemo } from 'react'
import { isSameMonth, format } from 'date-fns'
import { useTheme } from '@mui/material/styles'
import { CalendarLayout, useCalendar } from '@/components/shared/calendar/CalendarLayout'
import { UserCalendarDayCell } from './UserCalendarDayCell'
import { UserCalendarEvent } from './UserCalendarItem'

interface UserCalendarProps {
    events: UserCalendarEvent[]
    onViewBooking?: (bookingId: string) => void
}

export function UserCalendar({ events, onViewBooking }: UserCalendarProps) {
    const theme = useTheme()
    const {
        currentMonth,
        monthStart,
        calendarDays,
        nextMonth,
        prevMonth,
        goToToday,
    } = useCalendar()

    // Group events by date
    const eventsByDate = useMemo(() => {
        const map: Record<string, UserCalendarEvent[]> = {}
        events.forEach((event) => {
            const dateKey = format(event.startTime, 'yyyy-MM-dd')
            if (!map[dateKey]) map[dateKey] = []
            map[dateKey].push(event)
        })
        return map
    }, [events])

    const legends = useMemo(() => [
        { label: 'Booking', color: theme.palette.primary.main },
        { label: 'Availability', color: theme.palette.success.main },
        { label: 'Blockage', color: theme.palette.error.main },
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
                const dayEvents = eventsByDate[dateKey] || []
                const isCurrentMonth = isSameMonth(day, monthStart)

                return (
                    <UserCalendarDayCell
                        key={dateKey}
                        day={day}
                        isCurrentMonth={isCurrentMonth}
                        isToday={format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
                        events={dayEvents}
                        onViewBooking={onViewBooking}
                    />
                )
            })}
        </CalendarLayout>
    )
}

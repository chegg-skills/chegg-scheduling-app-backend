import { useMemo } from 'react'
import { isSameMonth, format, parseISO } from 'date-fns'
import { useTheme } from '@mui/material/styles'
import type { EventScheduleSlot } from '@/types'

// Shared Calendar Components
import { CalendarLayout, useCalendar } from '@/components/shared/calendar/CalendarLayout'
import { ScheduleDayCell } from './calendar/ScheduleDayCell'

interface ScheduleCalendarProps {
  slots: EventScheduleSlot[]
  onViewDetail?: (slot: EventScheduleSlot) => void
}

export function ScheduleCalendar({ slots, onViewDetail }: ScheduleCalendarProps) {
  const theme = useTheme()
  const {
    currentMonth,
    monthStart,
    calendarDays,
    nextMonth,
    prevMonth,
    goToToday,
  } = useCalendar()

  const slotsByDate = useMemo(() => {
    const map: Record<string, EventScheduleSlot[]> = {}
    slots.forEach((slot) => {
      const dateKey = format(parseISO(slot.startTime), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(slot)
    })
    return map
  }, [slots])

  const legends = useMemo(() => [
    { label: 'Unique Series', color: theme.palette.primary.main },
    { label: 'Individual Session', color: theme.palette.success.main },
    { label: 'Strikethrough = Cancelled', color: theme.palette.text.secondary },
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
        const daySlots = slotsByDate[dateKey] || []
        const isCurrentMonth = isSameMonth(day, monthStart)

        return (
          <ScheduleDayCell
            key={dateKey}
            day={day}
            isCurrentMonth={isCurrentMonth}
            isToday={format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
            slots={daySlots}
            onViewDetail={onViewDetail}
          />
        )
      })}
    </CalendarLayout>
  )
}

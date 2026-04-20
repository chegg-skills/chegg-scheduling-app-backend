import { useState } from 'react'
import {
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
} from 'date-fns'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { CalendarHeader, CalendarLegend } from './CalendarHeader'

export function useCalendar(initialDate: Date = new Date()) {
    const [currentMonth, setCurrentMonth] = useState(initialDate)

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

    return {
        currentMonth,
        monthStart,
        calendarDays,
        nextMonth,
        prevMonth,
        goToToday,
    }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface CalendarLayoutProps {
    currentMonth: Date
    onPrevMonth: () => void
    onNextMonth: () => void
    onToday: () => void
    legends?: CalendarLegend[]
    children: React.ReactNode
}

export function CalendarLayout({
    currentMonth,
    onPrevMonth,
    onNextMonth,
    onToday,
    legends,
    children,
}: CalendarLayoutProps) {
    return (
        <Paper
            variant="outlined"
            sx={{
                overflow: 'hidden',
                bgcolor: 'background.paper',
                borderRadius: 2,
            }}
        >
            <CalendarHeader
                currentMonth={currentMonth}
                onPrevMonth={onPrevMonth}
                onNextMonth={onNextMonth}
                onToday={onToday}
                legends={legends}
            />

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    bgcolor: 'divider',
                    gap: '1px',
                }}
            >
                {/* Header Row - Rendered directly as grid items */}
                {DAYS.map((day) => (
                    <Box
                        key={day}
                        sx={{
                            py: 1.5,
                            textAlign: 'center',
                            bgcolor: 'background.paper',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 800,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: 1,
                                fontSize: '0.65rem',
                            }}
                        >
                            {day}
                        </Typography>
                    </Box>
                ))}

                {/* Calendar Days - Passed from parent and spread as grid items */}
                {children}
            </Box>
        </Paper>
    )
}

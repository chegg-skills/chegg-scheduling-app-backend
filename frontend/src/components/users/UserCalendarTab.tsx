import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import { format, parseISO, startOfDay, endOfDay, getDay } from 'date-fns'
import {
    useWeeklyAvailability,
    useAvailabilityExceptions,
} from '@/hooks/queries/useAvailability'
import { useBookings } from '@/hooks/queries/useBookings'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { UserCalendar } from './calendar/UserCalendar'
import { UserCalendarEvent } from './calendar/UserCalendarItem'
import type { UserWithDetails } from '@/types'
import { BookingDetailModal } from '@/components/bookings/BookingDetailModal'
import { useBooking } from '@/hooks/queries/useBookings'

interface UserCalendarTabProps {
    user: UserWithDetails
}

export function UserCalendarTab({ user }: UserCalendarTabProps) {
    const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

    const { data: weekly, isLoading: isLoadingWeekly, error: errorWeekly } = useWeeklyAvailability(user.id)
    const { data: exceptions, isLoading: isLoadingExceptions, error: errorExceptions } = useAvailabilityExceptions(user.id)
    const { data: bookingsData, isLoading: isLoadingBookings, error: errorBookings } = useBookings({ coachUserId: user.id, limit: 1000 })

    const { data: selectedBooking } = useBooking(selectedBookingId || '')

    const events = useMemo(() => {
        const allEvents: UserCalendarEvent[] = []

        // 1. Add Bookings
        if (bookingsData?.bookings) {
            bookingsData.bookings.forEach((b) => {
                allEvents.push({
                    id: b.id,
                    type: 'BOOKING',
                    title: `Session: ${b.studentName}`,
                    startTime: parseISO(b.startTime),
                    endTime: parseISO(b.endTime),
                    status: b.status,
                })
            })
        }

        // 2. Add Exceptions (Blockages or Custom Availability)
        if (exceptions) {
            exceptions.forEach((ex) => {
                const date = parseISO(ex.date)
                if (ex.isUnavailable) {
                    allEvents.push({
                        id: `exception-${ex.id}`,
                        type: 'BLOCKAGE',
                        title: ex.startTime ? `Blockage: ${ex.startTime} - ${ex.endTime}` : 'Time Off (All Day)',
                        startTime: ex.startTime ? parseISO(`${ex.date.split('T')[0]}T${ex.startTime}`) : startOfDay(date),
                        endTime: ex.endTime ? parseISO(`${ex.date.split('T')[0]}T${ex.endTime}`) : endOfDay(date),
                    })
                } else if (ex.startTime && ex.endTime) {
                    allEvents.push({
                        id: `exception-${ex.id}`,
                        type: 'AVAILABILITY',
                        title: `Custom: ${ex.startTime} - ${ex.endTime}`,
                        startTime: parseISO(`${ex.date.split('T')[0]}T${ex.startTime}`),
                        endTime: parseISO(`${ex.date.split('T')[0]}T${ex.endTime}`),
                    })
                }
            })
        }

        // 3. Add Recurring Availability (Expanded for the "Season" - current month and surrounding)
        if (weekly) {
            // NOTE: The `UserCalendar` uses `useCalendar` which calculates `calendarDays`.
            // To strictly follow DRY and expansion, we could expand for a wide range here.
            // For now, let's expand for 3 months (last, current, next) to cover most views.
            const now = new Date()
            const startRange = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1))
            const endRange = endOfDay(new Date(now.getFullYear(), now.getMonth() + 2, 0))

            const daysInRange: Date[] = []
            let current = new Date(startRange)
            while (current <= endRange) {
                daysInRange.push(new Date(current))
                current.setDate(current.getDate() + 1)
            }

            daysInRange.forEach((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')

                // Skip if there's an exception for this day
                const hasException = exceptions?.some((ex) => format(parseISO(ex.date), 'yyyy-MM-dd') === dateStr)
                if (hasException) return

                const dayOfWeek = getDay(day) // 0=Sun, 1=Mon, ..., 6=Sat
                const daySlots = weekly.filter((slot) => slot.dayOfWeek === dayOfWeek)

                daySlots.forEach((slot) => {
                    allEvents.push({
                        id: `weekly-${slot.id}-${dateStr}`,
                        type: 'AVAILABILITY',
                        title: `Available: ${slot.startTime} - ${slot.endTime}`,
                        startTime: parseISO(`${dateStr}T${slot.startTime}`),
                        endTime: parseISO(`${dateStr}T${slot.endTime}`),
                    })
                })
            })
        }

        return allEvents
    }, [bookingsData, exceptions, weekly])

    if (isLoadingWeekly || isLoadingExceptions || isLoadingBookings) return <PageSpinner />
    if (errorWeekly || errorExceptions || errorBookings) return <ErrorAlert message="Failed to load calendar data." />

    return (
        <Box sx={{ mt: 2 }}>
            <UserCalendar events={events} onViewBooking={setSelectedBookingId} />

            <BookingDetailModal
                booking={selectedBooking?.booking || null}
                onClose={() => setSelectedBookingId(null)}
            />
        </Box>
    )
}

import { useMemo } from 'react'
import type { Booking } from '@/types'
import { usePublicSlots } from '@/hooks/queries/usePublicBooking'
import { startOfDayInTimezone } from '@/utils/dateTimezone'

/**
 * Resolves the slot data for the follow-up scheduler: the max selectable date
 * (from the event's booking window, anchored to the student's timezone), the
 * fetched slots for the selected day, the AM/PM partition, and the timezone-aware
 * formatters. Behavior is unchanged from the original inline logic.
 */
export function useFollowUpSlots(
  booking: Booking | null,
  selectedDate: Date,
  selectedTimezone: string
) {
  // Max selectable date based on event's booking window, anchored to the student's timezone
  const maxDate = useMemo(() => {
    const days = booking?.event?.maxBookingWindowDays
    if (!days) return undefined
    const today = new Date()
    return startOfDayInTimezone(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + days,
      selectedTimezone
    )
  }, [booking?.event?.maxBookingWindowDays, selectedTimezone])

  // Calculate startDate & endDate for slots query based on selectedDate & selectedTimezone
  const { startStr, endStr } = useMemo(() => {
    if (!booking) return { startStr: '', endStr: '' }
    return {
      startStr: startOfDayInTimezone(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTimezone
      ).toISOString(),
      endStr: new Date(
        startOfDayInTimezone(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate() + 1,
          selectedTimezone
        ).getTime() - 1
      ).toISOString(),
    }
  }, [selectedDate, selectedTimezone, booking])

  // Fetch slots for event filtered by original coach
  const { data: slots = [], isLoading: isLoadingSlots } = usePublicSlots(
    booking?.eventId || '',
    startStr,
    endStr,
    booking?.coachUserId || undefined,
    selectedTimezone
  )

  const timeFormat = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    [selectedTimezone]
  )

  const dateFormat = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    []
  )

  const hourExtractor = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        hour: 'numeric',
        hourCycle: 'h23',
      }),
    [selectedTimezone]
  )

  const { amSlots, pmSlots } = useMemo(() => {
    const am: any[] = []
    const pm: any[] = []

    const sorted = [...slots].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )

    sorted.forEach((s) => {
      const date = new Date(s.startTime)
      const hourStr = hourExtractor.format(date)
      const hour = parseInt(hourStr, 10)

      if (hour < 12) {
        am.push(s)
      } else {
        pm.push(s)
      }
    })

    return { amSlots: am, pmSlots: pm }
  }, [slots, hourExtractor])

  /** Formats a slot ISO string as "h:mm AM (Timezone Name)" in the selected timezone. */
  const formatSlotWithTz = (slotIso: string) => {
    const dateObj = new Date(slotIso)
    const timeStr = new Intl.DateTimeFormat('en-US', {
      timeZone: selectedTimezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(dateObj)
    const tzName =
      new Intl.DateTimeFormat('en-US', {
        timeZone: selectedTimezone,
        timeZoneName: 'long',
      })
        .formatToParts(dateObj)
        .find((p) => p.type === 'timeZoneName')?.value || ''
    return tzName ? `${timeStr} (${tzName})` : timeStr
  }

  return {
    maxDate,
    slots,
    isLoadingSlots,
    amSlots,
    pmSlots,
    timeFormat,
    dateFormat,
    formatSlotWithTz,
  }
}

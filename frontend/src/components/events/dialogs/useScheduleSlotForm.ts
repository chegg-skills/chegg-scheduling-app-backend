import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  isWeekdayAllowed,
  formatAllowedWeekdays,
  isSlotWithinAvailability,
  formatAvailabilityRanges,
} from '../form/eventCapabilityRules'
import { formatTimezoneLabel } from '@/components/users/userSystemFieldUtils'
import { utcToZonedString, zonedStringToUTC } from '@/utils/dateTimezone'
import type { Event, EventScheduleSlot } from '@/types'
import type { RecurrenceConfig } from './RecurrenceSelector'
import { useTimezones } from '@/hooks/queries/useConfig'

interface UseScheduleSlotFormProps {
  event: Event
  slot?: EventScheduleSlot | null
  isOpen: boolean
}

export function useScheduleSlotForm({ event, slot, isOpen }: UseScheduleSlotFormProps) {
  const allowedDays = useMemo(() => event.allowedWeekdays ?? [], [event.allowedWeekdays])
  const { data: timezones = [] } = useTimezones()
  const timezoneLabel = useMemo(
    () => formatTimezoneLabel(event.timezone, timezones),
    [event.timezone, timezones],
  )

  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotCapacity, setNewSlotCapacity] = useState<number | ''>('')
  const [assignedCoachId, setAssignedCoachId] = useState<string | null>(null)
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = useCallback((dateValue: string) => {
    if (!dateValue) {
      setError(null)
      return true
    }

    // Interpret the datetime-local string as wall-clock time in the event's timezone,
    // then validate the resulting UTC instant against the event's availability windows.
    const slotDate = zonedStringToUTC(dateValue, event.timezone)

    if (!isWeekdayAllowed(slotDate, allowedDays, event.weeklyAvailability, event.timezone)) {
      setError(
        `Selected date must be one of the allowed weekdays: ${formatAllowedWeekdays(allowedDays, event.weeklyAvailability)}`
      )
      return false
    }

    if (!isSlotWithinAvailability(slotDate, event.durationSeconds, event.weeklyAvailability, event.timezone)) {
      setError(
        `Session must be within allowed time ranges for this day: ${formatAvailabilityRanges(slotDate, event.weeklyAvailability, event.timezone)} (${timezoneLabel})`
      )
      return false
    }

    setError(null)
    return true
  }, [allowedDays, event.weeklyAvailability, event.durationSeconds, event.timezone, timezoneLabel])

  // Sync state when slot changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (slot) {
        // Format existing slot time in the event's timezone so the datetime-local
        // input shows the wall-clock time the admin originally entered, not browser TZ.
        const dateStr = utcToZonedString(new Date(slot.startTime), event.timezone)
        setNewSlotDate(dateStr)
        setNewSlotCapacity(slot.capacity ?? '')
        setAssignedCoachId(slot.assignedCoachId ?? null)
        setRecurrence(null)
        validate(dateStr)
      } else {
        // Default to "now" expressed in the event's timezone
        const initialDate = utcToZonedString(new Date(), event.timezone)
        setNewSlotDate(initialDate)
        setNewSlotCapacity('')
        setAssignedCoachId(null)
        setRecurrence(null)
        validate(initialDate)
      }
    }
  }, [isOpen, slot, validate, event.timezone])

  const handleDateChange = (value: string) => {
    setNewSlotDate(value)
    validate(value)
  }

  return {
    newSlotDate,
    newSlotCapacity,
    assignedCoachId,
    recurrence,
    error,
    setNewSlotCapacity,
    setAssignedCoachId,
    setRecurrence,
    handleDateChange,
    isValid: !error && !!newSlotDate,
  }
}

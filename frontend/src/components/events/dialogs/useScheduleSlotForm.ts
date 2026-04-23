import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import {
  isWeekdayAllowed,
  formatAllowedWeekdays,
  isSlotWithinAvailability,
  formatAvailabilityRanges,
} from '../form/eventCapabilityRules'
import type { Event, EventScheduleSlot } from '@/types'

interface UseScheduleSlotFormProps {
  event: Event
  slot?: EventScheduleSlot | null
  isOpen: boolean
}

export function useScheduleSlotForm({ event, slot, isOpen }: UseScheduleSlotFormProps) {
  const allowedDays = useMemo(() => event.allowedWeekdays ?? [], [event.allowedWeekdays])

  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotCapacity, setNewSlotCapacity] = useState<number | ''>('')
  const [assignedCoachId, setAssignedCoachId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validate = (dateValue: string) => {
    if (!dateValue) {
      setError(null)
      return true
    }

    if (!isWeekdayAllowed(dateValue, allowedDays, event.weeklyAvailability)) {
      setError(
        `Selected date must be one of the allowed weekdays: ${formatAllowedWeekdays(allowedDays, event.weeklyAvailability)}`
      )
      return false
    }

    if (!isSlotWithinAvailability(dateValue, event.durationSeconds, event.weeklyAvailability)) {
      setError(
        `Session must be within allowed time ranges for this day: ${formatAvailabilityRanges(dateValue, event.weeklyAvailability)}`
      )
      return false
    }

    setError(null)
    return true
  }

  // Sync state when slot changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (slot) {
        const dateStr = format(new Date(slot.startTime), "yyyy-MM-dd'T'HH:mm")
        setNewSlotDate(dateStr)
        setNewSlotCapacity(slot.capacity ?? '')
        setAssignedCoachId(slot.assignedCoachId ?? null)
        validate(dateStr)
      } else {
        const initialDate = format(new Date(), "yyyy-MM-dd'T'HH:mm")
        setNewSlotDate(initialDate)
        setNewSlotCapacity('')
        setAssignedCoachId(null)
        validate(initialDate)
      }
    }
  }, [isOpen, slot, allowedDays, event.weeklyAvailability, event.durationSeconds])

  const handleDateChange = (value: string) => {
    setNewSlotDate(value)
    validate(value)
  }

  return {
    newSlotDate,
    newSlotCapacity,
    assignedCoachId,
    error,
    setNewSlotCapacity,
    setAssignedCoachId,
    handleDateChange,
    isValid: !error && !!newSlotDate,
  }
}

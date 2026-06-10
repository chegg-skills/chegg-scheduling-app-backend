import { useState, useEffect } from 'react'
import { utcToZonedString } from '@/utils/dateTimezone'
import type { Event, EventScheduleSlot } from '@/types'
import type { RecurrenceConfig } from './RecurrenceSelector'

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

interface UseScheduleSlotFormProps {
  event: Event
  slot?: EventScheduleSlot | null
  isOpen: boolean
}

export function useScheduleSlotForm({ event, slot, isOpen }: UseScheduleSlotFormProps) {
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotCapacity, setNewSlotCapacity] = useState<number | ''>('')
  const [assignedCoachId, setAssignedCoachId] = useState<string | null>(null)
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null)

  // Sync state when slot changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (slot) {
        // Format existing slot time in the event's timezone so the datetime-local
        // input shows the wall-clock time the admin originally entered, not browser TZ.
        setNewSlotDate(utcToZonedString(new Date(slot.startTime), browserTimezone))
        setNewSlotCapacity(slot.capacity ?? '')
        setAssignedCoachId(slot.assignedCoachId ?? null)
        setRecurrence(null)
      } else {
        setNewSlotDate(utcToZonedString(new Date(), browserTimezone))
        setNewSlotCapacity('')
        setAssignedCoachId(null)
        setRecurrence(null)
      }
    }
  }, [isOpen, slot])

  const handleDateChange = (value: string) => {
    setNewSlotDate(value)
  }

  return {
    newSlotDate,
    newSlotCapacity,
    assignedCoachId,
    recurrence,
    error: null,
    setNewSlotCapacity,
    setAssignedCoachId,
    setRecurrence,
    handleDateChange,
    isValid: !!newSlotDate,
  }
}

import { useState, useEffect } from 'react'
import { utcToZonedString } from '@/utils/dateTimezone'
import type { Event, EventScheduleSlot } from '@/types'
import type { RecurrenceConfig } from './RecurrenceSelector'

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
        setNewSlotDate(utcToZonedString(new Date(slot.startTime), event.timezone))
        setNewSlotCapacity(slot.capacity ?? '')
        setAssignedCoachId(slot.assignedCoachId ?? null)
        setRecurrence(null)
      } else {
        // Default to "now" expressed in the event's timezone
        setNewSlotDate(utcToZonedString(new Date(), event.timezone))
        setNewSlotCapacity('')
        setAssignedCoachId(null)
        setRecurrence(null)
      }
    }
  }, [isOpen, slot, event.timezone])

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

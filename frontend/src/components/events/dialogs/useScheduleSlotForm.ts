import { useState, useEffect } from 'react'
import { utcToZonedString } from '@/utils/dateTimezone'
import type { EventScheduleSlot } from '@/types'
import type { RecurrenceConfig } from './RecurrenceSelector'

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

interface UseScheduleSlotFormProps {
  slot?: EventScheduleSlot | null
  isOpen: boolean
}

export function useScheduleSlotForm({ slot, isOpen }: UseScheduleSlotFormProps) {
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

  // In edit mode, suppress the past-date error while the user hasn't changed the time yet
  // (the slot may already be in the past — we allow viewing it, just not moving it further back).
  const originalSlotTime = slot ? utcToZonedString(new Date(slot.startTime), browserTimezone) : null
  const isUnchangedPastSlot = !!originalSlotTime && newSlotDate === originalSlotTime
  const isPast = !!newSlotDate && !isUnchangedPastSlot && new Date(newSlotDate) < new Date()
  const error = isPast ? 'Session start time cannot be in the past.' : null

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
    isValid: !!newSlotDate && !error,
  }
}

import { useState, useEffect } from 'react'
import { utcToZonedString, zonedStringToUTC } from '@/utils/dateTimezone'
import type { EventScheduleSlot } from '@/types'
import type { RecurrenceConfig } from './RecurrenceSelector'

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

// The timezone an existing slot's wall-clock should be shown/edited in: its own
// stored timezone, else its series' anchor, else the viewer's browser zone (for
// legacy slots created before the picker existed).
function resolveSlotTimezone(slot?: EventScheduleSlot | null): string {
  return slot?.timezone ?? slot?.recurrenceGroup?.timezone ?? browserTimezone
}

interface UseScheduleSlotFormProps {
  slot?: EventScheduleSlot | null
  isOpen: boolean
}

export function useScheduleSlotForm({ slot, isOpen }: UseScheduleSlotFormProps) {
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotCapacity, setNewSlotCapacity] = useState<number | ''>('')
  const [assignedCoachId, setAssignedCoachId] = useState<string | null>(null)
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null)
  // The timezone the entered wall-clock is interpreted in — surfaced via the picker.
  const [timezone, setTimezone] = useState(browserTimezone)

  // Sync state when slot changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (slot) {
        // Format existing slot time in its stored timezone so the datetime input
        // shows the wall-clock the admin originally entered, not the browser zone.
        const slotTz = resolveSlotTimezone(slot)
        setTimezone(slotTz)
        setNewSlotDate(utcToZonedString(new Date(slot.startTime), slotTz))
        setNewSlotCapacity(slot.capacity ?? '')
        setAssignedCoachId(slot.assignedCoachId ?? null)
        setRecurrence(null)
      } else {
        setTimezone(browserTimezone)
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
  const originalSlotTimezone = slot ? resolveSlotTimezone(slot) : null
  const originalSlotTime = slot
    ? utcToZonedString(new Date(slot.startTime), originalSlotTimezone!)
    : null
  // Only suppress the past-time warning while BOTH the wall-clock and the timezone are
  // untouched — changing just the picker still moves the real instant, so re-check it.
  const isUnchangedPastSlot =
    !!originalSlotTime && newSlotDate === originalSlotTime && timezone === originalSlotTimezone
  // Interpret the entered wall-clock in the selected timezone before comparing to now,
  // so the soft past-warning is correct even when configuring for a far-away zone.
  const proposedInstant = newSlotDate ? zonedStringToUTC(newSlotDate, timezone) : null
  const isPast = !!proposedInstant && !isUnchangedPastSlot && proposedInstant < new Date()
  const error = isPast ? 'Session start time cannot be in the past.' : null

  return {
    newSlotDate,
    newSlotCapacity,
    assignedCoachId,
    recurrence,
    timezone,
    error,
    setNewSlotCapacity,
    setAssignedCoachId,
    setRecurrence,
    setTimezone,
    handleDateChange,
    isValid: !!newSlotDate && !error,
  }
}

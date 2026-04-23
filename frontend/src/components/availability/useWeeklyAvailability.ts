import { useState, useEffect } from 'react'
import type { SetWeeklyAvailabilityDto } from '@/types'
import {
  buildDaysFromValue,
  serializeDaysToValue,
  createNextSlot,
  getDefaultSlot,
  cloneSlot,
  type DayAvailability,
} from './availabilityPickerUtils'

interface UseWeeklyAvailabilityProps {
  value: SetWeeklyAvailabilityDto
  onChange: (value: SetWeeklyAvailabilityDto) => void
  showFooter?: boolean
}

export function useWeeklyAvailability({
  value,
  onChange,
  showFooter,
}: UseWeeklyAvailabilityProps) {
  const [days, setDays] = useState<DayAvailability[]>(() => buildDaysFromValue(value))

  // Sync internal state when the value prop changes from the parent
  useEffect(() => {
    const nextDays = buildDaysFromValue(value)
    const currentSerialized = JSON.stringify(serializeDaysToValue(days))
    const nextSerialized = JSON.stringify(serializeDaysToValue(nextDays))

    if (currentSerialized !== nextSerialized) {
      setDays(nextDays)
    }
  }, [value, days])

  const notifyChange = (nextDays: DayAvailability[]) => {
    setDays(nextDays)
    if (showFooter === false) {
      onChange(serializeDaysToValue(nextDays))
    }
  }

  const handleToggleDay = (dayIndex: number) => {
    const nextDays = days.map((day, index) =>
      index === dayIndex ? { ...day, enabled: !day.enabled } : day
    )
    notifyChange(nextDays)
  }

  const handleAddSlot = (dayIndex: number) => {
    const nextDays = days.map((day, index) =>
      index === dayIndex ? { ...day, slots: [...day.slots, createNextSlot(day.slots)] } : day
    )
    notifyChange(nextDays)
  }

  const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
    const nextDays = days.map((day, index) => {
      if (index !== dayIndex) return day

      const nextSlots = day.slots.filter((_, currentIndex) => currentIndex !== slotIndex)
      return nextSlots.length === 0
        ? { ...day, enabled: false, slots: [getDefaultSlot()] }
        : { ...day, slots: nextSlots }
    })
    notifyChange(nextDays)
  }

  const handleTimeChange = (
    dayIndex: number,
    slotIndex: number,
    field: 'startTime' | 'endTime',
    nextValue: string
  ) => {
    const nextDays = days.map((day, index) => {
      if (index !== dayIndex) return day

      return {
        ...day,
        slots: day.slots.map((slot, currentIndex) =>
          currentIndex === slotIndex ? { ...slot, [field]: nextValue } : slot
        ),
      }
    })
    notifyChange(nextDays)
  }

  const handleCopyDay = (fromIndex: number) => {
    const slotsToCopy = days[fromIndex].slots.map(cloneSlot)
    const nextDays = days.map((day, index) => {
      if (index !== fromIndex && day.enabled) {
        return { ...day, slots: slotsToCopy.map(cloneSlot) }
      }
      return day
    })
    notifyChange(nextDays)
  }

  const handleReset = () => {
    const initialDays = buildDaysFromValue(value)
    notifyChange(initialDays)
  }

  const handleSave = () => {
    onChange(serializeDaysToValue(days))
  }

  return {
    days,
    handleToggleDay,
    handleAddSlot,
    handleRemoveSlot,
    handleTimeChange,
    handleCopyDay,
    handleReset,
    handleSave,
  }
}

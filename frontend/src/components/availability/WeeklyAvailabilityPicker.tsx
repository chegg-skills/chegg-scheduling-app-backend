import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import { Button } from '@/components/shared/Button'
import type { SetWeeklyAvailabilityDto } from '@/types'
import { AvailabilityDayRow } from './AvailabilityDayRow'
import {
  DAYS,
  buildDaysFromValue,
  cloneSlot,
  createNextSlot,
  getDefaultSlot,
  serializeDaysToValue,
  type DayAvailability,
} from './availabilityPickerUtils'

interface WeeklyAvailabilityPickerProps {
  value: SetWeeklyAvailabilityDto
  onChange: (value: SetWeeklyAvailabilityDto) => void
  disabled?: boolean
}

export function WeeklyAvailabilityPicker({
  value,
  onChange,
  disabled,
}: WeeklyAvailabilityPickerProps) {
  const [days, setDays] = useState<DayAvailability[]>(() => buildDaysFromValue(value))

  useEffect(() => {
    setDays(buildDaysFromValue(value))
  }, [value])

  const handleToggleDay = (dayIndex: number) => {
    setDays((prev) => prev.map((day, index) => (
      index === dayIndex ? { ...day, enabled: !day.enabled } : day
    )))
  }

  const handleAddSlot = (dayIndex: number) => {
    setDays((prev) => prev.map((day, index) => (
      index === dayIndex
        ? { ...day, slots: [...day.slots, createNextSlot(day.slots)] }
        : day
    )))
  }

  const handleRemoveSlot = (dayIndex: number, slotIndex: number) => {
    setDays((prev) => prev.map((day, index) => {
      if (index !== dayIndex) return day

      const nextSlots = day.slots.filter((_, currentIndex) => currentIndex !== slotIndex)
      return nextSlots.length === 0
        ? { ...day, enabled: false, slots: [getDefaultSlot()] }
        : { ...day, slots: nextSlots }
    }))
  }

  const handleTimeChange = (
    dayIndex: number,
    slotIndex: number,
    field: 'startTime' | 'endTime',
    nextValue: string,
  ) => {
    setDays((prev) => prev.map((day, index) => {
      if (index !== dayIndex) return day

      return {
        ...day,
        slots: day.slots.map((slot, currentIndex) => (
          currentIndex === slotIndex ? { ...slot, [field]: nextValue } : slot
        )),
      }
    }))
  }

  const handleCopyDay = (fromIndex: number) => {
    const slotsToCopy = days[fromIndex].slots.map(cloneSlot)

    setDays((prev) => prev.map((day, index) => {
      if (index !== fromIndex && day.enabled) {
        return { ...day, slots: slotsToCopy.map(cloneSlot) }
      }

      return day
    }))
  }

  const handleReset = () => {
    setDays(buildDaysFromValue(value))
  }

  const handleSave = () => {
    onChange(serializeDaysToValue(days))
  }

  return (
    <Box>
      <Stack spacing={2} divider={<Divider />}>
        {days.map((day, index) => (
          <AvailabilityDayRow
            key={DAYS[index]}
            dayLabel={DAYS[index]}
            dayIndex={index}
            day={day}
            disabled={disabled}
            onToggleDay={handleToggleDay}
            onAddSlot={handleAddSlot}
            onRemoveSlot={handleRemoveSlot}
            onTimeChange={handleTimeChange}
            onCopyDay={handleCopyDay}
          />
        ))}
      </Stack>

      <Box
        sx={{
          mt: 4,
          pt: 3,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
        }}
      >
        <Button variant="secondary" onClick={handleReset} disabled={disabled}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={disabled}
          sx={{ minWidth: 160 }}
        >
          Save changes
        </Button>
      </Box>
    </Box>
  )
}

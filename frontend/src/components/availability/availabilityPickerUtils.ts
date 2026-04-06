import type { SetWeeklyAvailabilityDto } from '@/types'

export const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export interface TimeSlot {
  startTime: string
  endTime: string
}

export interface DayAvailability {
  enabled: boolean
  slots: TimeSlot[]
}

const DEFAULT_SLOT: TimeSlot = {
  startTime: '09:00',
  endTime: '17:00',
}

export const cloneSlot = (slot: TimeSlot): TimeSlot => ({ ...slot })

export const getDefaultSlot = (): TimeSlot => ({ ...DEFAULT_SLOT })

export const buildDaysFromValue = (value: SetWeeklyAvailabilityDto): DayAvailability[] => {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const daySlots = value.filter((slot) => slot.dayOfWeek === dayOfWeek)

    return {
      enabled: daySlots.length > 0,
      slots: daySlots.length > 0
        ? daySlots.map(({ startTime, endTime }) => ({ startTime, endTime }))
        : [getDefaultSlot()],
    }
  })
}

export const serializeDaysToValue = (days: DayAvailability[]): SetWeeklyAvailabilityDto => {
  const result: SetWeeklyAvailabilityDto = []

  days.forEach((day, dayOfWeek) => {
    if (!day.enabled) return

    day.slots.forEach((slot) => {
      result.push({
        dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
    })
  })

  return result
}

export const createNextSlot = (slots: TimeSlot[]): TimeSlot => {
  const lastSlot = slots[slots.length - 1]
  const nextStart = lastSlot ? lastSlot.endTime : DEFAULT_SLOT.startTime
  const [hours, minutes] = nextStart.split(':').map(Number)

  return {
    startTime: nextStart,
    endTime: `${String(Math.min(hours + 1, 23)).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  }
}

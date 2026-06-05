import { useMemo } from 'react'
import type { EventScheduleSlot } from '@/types'
import type { ScheduleSeriesGroup } from '@/components/events/ScheduleSeriesTable'

/**
 * Custom hook to group flat schedule slots into series groups for table display.
 * Encapsulates the logic for identifying recurring series vs individual sessions.
 */
export function useScheduleSeriesGroups(
  slots: EventScheduleSlot[] | undefined
): ScheduleSeriesGroup[] {
  return useMemo(() => {
    if (!slots) return []
    const groups: Record<string, ScheduleSeriesGroup> = {}
    const now = new Date()

    slots.forEach((slot) => {
      const key = slot.recurrenceGroupId || `single-${slot.id}`
      if (!groups[key]) {
        groups[key] = {
          id: key,
          startTime: slot.startTime,
          endTime: slot.endTime,
          nextInstanceTime: null,
          isRecurring: !!slot.recurrenceGroupId,
          occurrenceCount: 0,
          slots: [],
          isContinuous: slot.recurrenceGroup?.isContinuous ?? false,
          isStopped: slot.recurrenceGroup ? !slot.recurrenceGroup.isActive : false,
        }
      }
      groups[key].occurrenceCount++
      groups[key].slots.push(slot)

      if (new Date(slot.startTime) < new Date(groups[key].startTime)) {
        groups[key].startTime = slot.startTime
        groups[key].endTime = slot.endTime
      }

      // Track the earliest upcoming non-cancelled slot for the "Next Instance" column
      if (!slot.isCancelled && new Date(slot.startTime) > now) {
        const current = groups[key].nextInstanceTime
        if (!current || new Date(slot.startTime) < new Date(current)) {
          groups[key].nextInstanceTime = slot.startTime
        }
      }
    })

    return Object.values(groups).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  }, [slots])
}

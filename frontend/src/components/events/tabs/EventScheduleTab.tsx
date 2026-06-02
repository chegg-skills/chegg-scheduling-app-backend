import { EventScheduleSlotManager } from '../EventScheduleSlotManager'
import type { Event, EventScheduleSlot } from '@/types'

interface EventScheduleTabProps {
  event: Event
  slots: EventScheduleSlot[]
  isLoading: boolean
  canManage?: boolean
}

export function EventScheduleTab({
  event,
  slots,
  isLoading,
  canManage = true,
}: EventScheduleTabProps) {
  return (
    <EventScheduleSlotManager
      event={event}
      slots={slots}
      isLoading={isLoading}
      canManage={canManage}
    />
  )
}

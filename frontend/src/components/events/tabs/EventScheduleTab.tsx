import { EventScheduleSlotManager } from '../EventScheduleSlotManager'
import type { Event, EventScheduleSlot } from '@/types'

interface EventScheduleTabProps {
  event: Event
  slots: EventScheduleSlot[]
  isLoading: boolean
}

export function EventScheduleTab({ event, slots, isLoading }: EventScheduleTabProps) {
  return <EventScheduleSlotManager event={event} slots={slots} isLoading={isLoading} />
}

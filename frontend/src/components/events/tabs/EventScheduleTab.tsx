import { EventScheduleSlotManager } from '../EventScheduleSlotManager'
import type { Event, EventScheduleSlot, TeamMember } from '@/types'

interface EventScheduleTabProps {
  event: Event
  slots: EventScheduleSlot[]
  isLoading: boolean
  teamMembers: TeamMember[]
}

export function EventScheduleTab({ event, slots, isLoading, teamMembers }: EventScheduleTabProps) {
  return <EventScheduleSlotManager event={event} slots={slots} isLoading={isLoading} teamMembers={teamMembers} />
}

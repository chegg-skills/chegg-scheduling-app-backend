import { EventHostManager } from '../EventHostManager'
import type { Event, TeamMember } from '@/types'

interface EventHostsTabProps {
  event: Event
  teamMembers: TeamMember[]
  showAddModal: boolean
  onCloseAddModal: () => void
  onViewUser: (userId: string) => void
}

export function EventHostsTab({
  event,
  teamMembers,
  showAddModal,
  onCloseAddModal,
  onViewUser,
}: EventHostsTabProps) {
  return (
    <EventHostManager
      eventId={event.id}
      hosts={event.hosts}
      teamMembers={teamMembers}
      assignmentStrategy={event.assignmentStrategy}
      interactionType={event.interactionType}
      hideHeader
      showAddModalOverride={showAddModal}
      onCloseAddModal={onCloseAddModal}
      onViewUser={onViewUser}
    />
  )
}

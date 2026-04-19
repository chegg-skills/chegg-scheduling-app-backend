import { EventCoachManager } from '../EventCoachManager'
import type { Event, TeamMember } from '@/types'

interface EventCoachesTabProps {
  event: Event
  teamMembers: TeamMember[]
  showAddModal: boolean
  onCloseAddModal: () => void
  onViewUser: (userId: string) => void
}

export function EventCoachesTab({
  event,
  teamMembers,
  showAddModal,
  onCloseAddModal,
  onViewUser,
}: EventCoachesTabProps) {
  return (
    <EventCoachManager
      eventId={event.id}
      coaches={event.coaches}
      teamMembers={teamMembers}
      assignmentStrategy={event.assignmentStrategy}
      minCoachCount={event.minCoachCount}
      hideHeader
      showAddModalOverride={showAddModal}
      onCloseAddModal={onCloseAddModal}
      onViewUser={onViewUser}
    />
  )
}

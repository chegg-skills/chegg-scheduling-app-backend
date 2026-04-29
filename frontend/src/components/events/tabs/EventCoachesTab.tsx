import { EventCoachManager } from '../EventCoachManager'
import type { Event, TeamMember } from '@/types'

interface EventCoachesTabProps {
  event: Event
  teamMembers: TeamMember[]
  showAddModal: boolean
  onOpenAddModal: () => void
  onCloseAddModal: () => void
  onViewUser: (userId: string) => void
}

export function EventCoachesTab({
  event,
  teamMembers,
  showAddModal,
  onOpenAddModal,
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
      showAddModalOverride={showAddModal}
      onOpenAddModal={onOpenAddModal}
      onCloseAddModal={onCloseAddModal}
      onViewUser={onViewUser}
    />
  )
}

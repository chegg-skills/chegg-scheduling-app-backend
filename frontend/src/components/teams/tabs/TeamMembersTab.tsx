import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { TeamMemberList } from '@/components/team-members/TeamMemberList'
import { AddMemberForm } from '@/components/team-members/AddMemberForm'
import type { TeamMember, UserRole } from '@/types'

interface TeamMembersTabProps {
  members: TeamMember[]
  teamId: string
  currentUserRole: UserRole
  teamLeadId: string
  isLoading: boolean
  existingMemberIds: string[]
  showAddModal: boolean
  onCloseAddModal: () => void
  onViewUser: (userId: string) => void
}

export function TeamMembersTab({
  members,
  teamId,
  currentUserRole,
  teamLeadId,
  isLoading,
  existingMemberIds,
  showAddModal,
  onCloseAddModal,
  onViewUser,
}: TeamMembersTabProps) {
  return (
    <>
      {isLoading ? (
        <PageSpinner />
      ) : (
        <TeamMemberList
          members={members}
          teamId={teamId}
          currentUserRole={currentUserRole}
          teamLeadId={teamLeadId}
          onViewUser={onViewUser}
        />
      )}

      <Modal isOpen={showAddModal} onClose={onCloseAddModal} title="Add member">
        <AddMemberForm
          teamId={teamId}
          existingMemberIds={existingMemberIds}
          onSuccess={onCloseAddModal}
          onCancel={onCloseAddModal}
        />
      </Modal>
    </>
  )
}

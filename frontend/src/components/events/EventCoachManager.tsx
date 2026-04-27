import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Plus } from 'lucide-react'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import type { EventCoach, TeamMember } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useEventCoaches, useSetEventCoaches, useRemoveEventCoach } from '@/hooks/queries/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { extractApiError } from '@/utils/apiError'
import { AddCoachForm } from './form/AddCoachForm'
import { EventCoachTable } from './EventCoachTable'
import { EventCoachStatusAlert } from './EventCoachStatusAlert'

interface EventCoachManagerProps {
  eventId: string
  coaches: EventCoach[]
  teamMembers: TeamMember[]
  assignmentStrategy?: string
  minCoachCount?: number
  title?: string
  hideHeader?: boolean
  showAddModalOverride?: boolean
  onCloseAddModal?: () => void
  onViewUser?: (userId: string) => void
}

export function EventCoachManager({
  eventId,
  coaches,
  teamMembers,
  assignmentStrategy,
  minCoachCount = 1,
  title,
  hideHeader,
  showAddModalOverride,
  onCloseAddModal,
  onViewUser,
}: EventCoachManagerProps) {
  const [localShowAddModal, setLocalShowAddModal] = useState(false)
  const [addCoachError, setAddCoachError] = useState<string | null>(null)
  const showAddModal = showAddModalOverride ?? localShowAddModal
  const setShowAddModal = onCloseAddModal ?? setLocalShowAddModal
  const { handleAction } = useAsyncAction()

  const { data: coachesResponse } = useEventCoaches(eventId)
  const { mutate: setCoaches, isPending: setting } = useSetEventCoaches(eventId)
  const { mutate: removeCoach } = useRemoveEventCoach(eventId)

  const activeCoaches = coachesResponse?.coaches ?? coaches

  const currentCoachUserIds = new Set(activeCoaches.map((c) => c.coachUserId))
  const eligibleCount = teamMembers.filter(
    (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentCoachUserIds.has(m.userId)
  ).length

  function handleAdd(userIds: string[]) {
    const newCoaches = [
      ...activeCoaches.map((c, i) => ({ userId: c.coachUserId, coachOrder: c.coachOrder ?? i + 1 })),
      ...userIds.map((userId, i) => ({
        userId,
        coachOrder: activeCoaches.length + i + 1,
      })),
    ]
    setCoaches(
      { coaches: newCoaches },
      {
        onSuccess: () => {
          setAddCoachError(null)
          if (onCloseAddModal) {
            onCloseAddModal()
          } else {
            setLocalShowAddModal(false)
          }
        },
        onError: (error: Error) => {
          setAddCoachError(extractApiError(error))
        },
      }
    )
  }

  const handleRemove = (coachUserId: string, name: string) => {
    handleAction(removeCoach, coachUserId, {
      title: 'Remove Coach',
      message: `Are you sure you want to remove ${name} as a coach for this event?`,
      actionName: 'Remove',
    })
  }

  return (
    <Stack spacing={2}>
      <EventCoachStatusAlert
        activeCoachCount={activeCoaches.length}
        assignmentStrategy={assignmentStrategy || 'DIRECT'}
        minCoachCount={minCoachCount}
      />

      {!hideHeader && (
        <SectionHeader 
          title={title || 'Assigned Coaches'}
          description="Manage coaches assigned to this event and their participation status."
          action={
            eligibleCount > 0 && (
              <Button size="sm" startIcon={<Plus size={16} />} onClick={() => setShowAddModal(true)}>
                Add coach
              </Button>
            )
          }
        />
      )}

      <EventCoachTable coaches={activeCoaches} onRemove={handleRemove} onViewUser={onViewUser} />

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setAddCoachError(null)
          onCloseAddModal ? onCloseAddModal() : setLocalShowAddModal(false)
        }}
        title="Add coach to event"
        size="sm"
      >
        <Stack spacing={2}>
          {addCoachError && <ErrorAlert message={addCoachError} />}
          <AddCoachForm
            activeCoaches={activeCoaches}
            teamMembers={teamMembers}
            assignmentStrategy={assignmentStrategy}
            isPending={setting}
            onAdd={handleAdd}
            onCancel={() => {
              setAddCoachError(null)
              onCloseAddModal ? onCloseAddModal() : setLocalShowAddModal(false)
            }}
          />
        </Stack>
      </Modal>
    </Stack>
  )
}

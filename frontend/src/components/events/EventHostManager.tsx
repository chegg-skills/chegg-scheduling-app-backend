import { useState } from 'react'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Plus } from 'lucide-react'
import type { EventHost, TeamMember } from '@/types'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { useEventHosts, useSetEventHosts, useRemoveEventHost } from '@/hooks/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { AddHostForm } from './AddHostForm'
import { EventHostTable } from './EventHostTable'
import { EventHostStatusAlert } from './EventHostStatusAlert'

interface EventHostManagerProps {
  eventId: string
  hosts: EventHost[]
  teamMembers: TeamMember[]
  assignmentStrategy?: string
  interactionType?: { minHosts: number } | null
  title?: string
  hideHeader?: boolean
  showAddModalOverride?: boolean
  onCloseAddModal?: () => void
  onViewUser?: (userId: string) => void
}

export function EventHostManager({
  eventId,
  hosts,
  teamMembers,
  assignmentStrategy,
  interactionType,
  title,
  hideHeader,
  showAddModalOverride,
  onCloseAddModal,
  onViewUser,
}: EventHostManagerProps) {
  const [localShowAddModal, setLocalShowAddModal] = useState(false)
  const showAddModal = showAddModalOverride ?? localShowAddModal
  const setShowAddModal = onCloseAddModal ?? setLocalShowAddModal
  const { handleAction } = useAsyncAction()

  const { data: hostsResponse } = useEventHosts(eventId)
  const { mutate: setHosts, isPending: setting } = useSetEventHosts(eventId)
  const { mutate: removeHost } = useRemoveEventHost(eventId)

  const activeHosts = hostsResponse?.hosts ?? hosts

  const currentHostUserIds = new Set(activeHosts.map((h) => h.hostUserId))
  const eligibleCount = teamMembers.filter(
    (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentHostUserIds.has(m.userId)
  ).length

  function handleAdd(userIds: string[]) {
    const newHosts = [
      ...activeHosts.map((h, i) => ({ userId: h.hostUserId, hostOrder: h.hostOrder ?? i + 1 })),
      ...userIds.map((userId, i) => ({
        userId,
        hostOrder: activeHosts.length + i + 1,
      })),
    ]
    setHosts(
      { hosts: newHosts },
      {
        onSuccess: () => {
          if (onCloseAddModal) {
            onCloseAddModal()
          } else {
            setLocalShowAddModal(false)
          }
        },
      }
    )
  }

  const handleRemove = (hostUserId: string, name: string) => {
    handleAction(removeHost, hostUserId, {
      title: 'Remove Coach',
      message: `Are you sure you want to remove ${name} as a coach for this event?`,
      actionName: 'Remove',
    })
  }

  return (
    <Stack spacing={2}>
      <EventHostStatusAlert
        activeHostCount={activeHosts.length}
        assignmentStrategy={assignmentStrategy || 'DIRECT'}
        interactionType={interactionType || null}
      />

      {!hideHeader && (
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          {title && (
            <Typography variant="h6">
              {title} - {activeHosts.length}
            </Typography>
          )}
          {eligibleCount > 0 && (
            <Button size="sm" onClick={() => setShowAddModal(true)}>
              <Plus size={16} /> Add coach
            </Button>
          )}
        </Stack>
      )}

      <EventHostTable hosts={activeHosts} onRemove={handleRemove} onViewUser={onViewUser} />

      <Modal
        isOpen={showAddModal}
        onClose={() => (onCloseAddModal ? onCloseAddModal() : setLocalShowAddModal(false))}
        title="Add coach to event"
        size="sm"
      >
        <AddHostForm
          activeHosts={activeHosts}
          teamMembers={teamMembers}
          assignmentStrategy={assignmentStrategy}
          isPending={setting}
          onAdd={handleAdd}
          onCancel={() => (onCloseAddModal ? onCloseAddModal() : setLocalShowAddModal(false))}
        />
      </Modal>
    </Stack>
  )
}

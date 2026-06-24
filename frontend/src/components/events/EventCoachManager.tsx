import { useState, useEffect, useMemo } from 'react'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import { Plus, CalendarRange } from 'lucide-react'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import type { EventCoach, TeamMember, SetWeeklyAvailabilityDto } from '@/types'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEventCoaches, useSetEventCoaches, useRemoveEventCoach, eventKeys } from '@/hooks/queries/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { extractApiError } from '@/utils/apiError'
import { AddCoachForm } from './form/AddCoachForm'
import { EventCoachTable } from './EventCoachTable'
import { EventCoachStatusAlert } from './EventCoachStatusAlert'
import { BulkCoachAvailabilityDialog } from './dialogs/BulkCoachAvailabilityDialog'
import { eventsApi } from '@/api/events'

interface EventCoachManagerProps {
  eventId: string
  coaches: EventCoach[]
  teamMembers: TeamMember[]
  assignmentStrategy?: string
  title?: string
  hideHeader?: boolean
  showAddModalOverride?: boolean
  onOpenAddModal?: () => void
  onCloseAddModal?: () => void
  onViewUser?: (userId: string) => void
  canManage?: boolean
}

export function EventCoachManager({
  eventId,
  coaches,
  teamMembers,
  assignmentStrategy,
  title,
  hideHeader,
  showAddModalOverride,
  onOpenAddModal,
  onCloseAddModal,
  onViewUser,
  canManage = true,
}: EventCoachManagerProps) {
  const [localShowAddModal, setLocalShowAddModal] = useState(false)
  const [showBulkScheduleDialog, setShowBulkScheduleDialog] = useState(false)
  const [addCoachError, setAddCoachError] = useState<string | null>(null)
  const [isSavingAvailability, setIsSavingAvailability] = useState(false)
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<string>>(new Set())
  const showAddModal = showAddModalOverride || localShowAddModal
  const { handleAction } = useAsyncAction()
  const queryClient = useQueryClient()

  const { data: coachesResponse } = useEventCoaches(eventId)
  const { mutate: setCoaches, isPending: setting } = useSetEventCoaches(eventId)
  const { mutate: removeCoach } = useRemoveEventCoach(eventId)

  const { data: workloadResponse } = useQuery({
    queryKey: eventKeys.coachWorkload(eventId),
    queryFn: ({ signal }) => eventsApi.getCoachWorkload(eventId, signal),
    enabled: !!eventId,
  })
  const workload = useMemo(() => {
    const map = new Map<string, number>()
    workloadResponse?.data?.data?.workload?.forEach(
      (w: { coachUserId: string; bookingCount: number }) => map.set(w.coachUserId, w.bookingCount)
    )
    return map
  }, [workloadResponse])

  const activeCoaches = coachesResponse?.coaches ?? coaches

  const selectable = canManage && activeCoaches.length >= 2

  // Drop selected ids that are no longer in the pool (e.g. a coach was removed).
  useEffect(() => {
    setSelectedCoachIds((prev) => {
      const valid = new Set(activeCoaches.map((c) => c.coachUserId))
      const next = new Set([...prev].filter((id) => valid.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [activeCoaches])

  const toggleCoach = (coachUserId: string) => {
    setSelectedCoachIds((prev) => {
      const next = new Set(prev)
      if (next.has(coachUserId)) next.delete(coachUserId)
      else next.add(coachUserId)
      return next
    })
  }

  const toggleAllCoaches = (checked: boolean) => {
    setSelectedCoachIds(checked ? new Set(activeCoaches.map((c) => c.coachUserId)) : new Set())
  }

  const selectedCoaches = activeCoaches.filter((c) => selectedCoachIds.has(c.coachUserId))

  const currentCoachUserIds = new Set(activeCoaches.map((c) => c.coachUserId))
  const eligibleCount = teamMembers.filter(
    (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentCoachUserIds.has(m.userId)
  ).length

  function handleAdd(
    userIds: string[],
    customSchedules?: Record<string, SetWeeklyAvailabilityDto>,
    hasCustomSchedule?: Record<string, boolean>
  ) {
    setIsSavingAvailability(true)
    const newCoaches = [
      ...activeCoaches.map((c, i) => ({
        userId: c.coachUserId,
        coachOrder: c.coachOrder ?? i + 1,
      })),
      ...userIds.map((userId, i) => ({
        userId,
        coachOrder: activeCoaches.length + i + 1,
      })),
    ]
    setCoaches(
      { coaches: newCoaches },
      {
        onSuccess: async () => {
          if (customSchedules && hasCustomSchedule) {
            try {
              const promises = Object.entries(customSchedules).map(([userId, slots]) => {
                if (userIds.includes(userId)) {
                  if (hasCustomSchedule[userId]) {
                    return eventsApi.setCoachAvailability(eventId, userId, slots)
                  } else {
                    return eventsApi.setCoachAvailability(eventId, userId, [])
                  }
                }
                return Promise.resolve()
              })
              await Promise.all(promises)
            } catch (error) {
              console.error('Failed to save coach custom availabilities:', error)
              setAddCoachError('Coaches were added, but failed to save some custom availabilities.')
              setIsSavingAvailability(false)
              return
            }
          }
          setIsSavingAvailability(false)
          setAddCoachError(null)

          // Invalidate coaches and workload queries to reflect the new pool
          queryClient.invalidateQueries({ queryKey: eventKeys.coaches(eventId) })
          queryClient.invalidateQueries({ queryKey: eventKeys.coachWorkload(eventId) })

          if (onCloseAddModal) {
            onCloseAddModal()
          } else {
            setLocalShowAddModal(false)
          }
        },
        onError: (error: Error) => {
          setIsSavingAvailability(false)
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
      />

      {!hideHeader && (
        <SectionHeader
          title={title || 'Assigned Coaches'}
          description="Manage coaches assigned to this event and their participation status."
          action={
            canManage && (
              <Stack direction="row" spacing={1}>
                {selectable && (
                  <Tooltip title={selectedCoaches.length === 0 ? 'Select coaches first' : ''}>
                    <span>
                      <Button
                        size="sm"
                        variant="secondary"
                        startIcon={<CalendarRange size={16} />}
                        disabled={selectedCoaches.length === 0}
                        onClick={() => setShowBulkScheduleDialog(true)}
                      >
                        {selectedCoaches.length > 0
                          ? `Bulk set schedule (${selectedCoaches.length})`
                          : 'Bulk set schedule'}
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {eligibleCount > 0 && (
                  <Button
                    size="sm"
                    startIcon={<Plus size={16} />}
                    onClick={() => {
                      if (onOpenAddModal) {
                        onOpenAddModal()
                      } else {
                        setLocalShowAddModal(true)
                      }
                    }}
                  >
                    Add coach
                  </Button>
                )}
              </Stack>
            )
          }
        />
      )}

      <EventCoachTable
        eventId={eventId}
        coaches={activeCoaches}
        onRemove={handleRemove}
        onViewUser={onViewUser}
        canManage={canManage}
        selectable={selectable}
        selectedCoachIds={selectedCoachIds}
        onToggleCoach={toggleCoach}
        onToggleAll={toggleAllCoaches}
        workload={workload}
      />

      <BulkCoachAvailabilityDialog
        isOpen={showBulkScheduleDialog}
        onClose={() => setShowBulkScheduleDialog(false)}
        eventId={eventId}
        coaches={selectedCoaches}
        onApplied={() => setSelectedCoachIds(new Set())}
      />

      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setAddCoachError(null)
          if (onCloseAddModal) onCloseAddModal()
          setLocalShowAddModal(false)
        }}
        title="Add coach to event"
        size="lg"
      >
        <Stack spacing={2}>
          {addCoachError && <ErrorAlert message={addCoachError} />}
          <AddCoachForm
            activeCoaches={activeCoaches}
            teamMembers={teamMembers}
            assignmentStrategy={assignmentStrategy}
            isPending={setting || isSavingAvailability}
            onAdd={handleAdd}
            onCancel={() => {
              setAddCoachError(null)
              if (onCloseAddModal) onCloseAddModal()
              setLocalShowAddModal(false)
            }}
          />
        </Stack>
      </Modal>
    </Stack>
  )
}

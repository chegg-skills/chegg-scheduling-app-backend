import { useState } from 'react'
import {
  useCreateEventScheduleSlot,
  useUpdateEventScheduleSlot,
  useDeleteEventScheduleSlot,
  useCancelEventScheduleSlot,
  useStopRecurrenceGroup,
  useResumeRecurrenceGroup,
} from '@/hooks/queries/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useConfirm } from '@/context/confirm'
import { extractApiError } from '@/utils/apiError'
import type { EventScheduleSlot } from '@/types'
import type { RecurrenceConfig } from './dialogs/RecurrenceSelector'
import type { ScheduleSeriesGroup } from './ScheduleSeriesTable'

interface SlotSaveData {
  startTime: string
  endTime: string
  capacity: number | null
  assignedCoachId?: string | null
  recurrence?: RecurrenceConfig | null
}

export function useSlotManagerActions(eventId: string) {
  const { mutate: create, isPending: creating } = useCreateEventScheduleSlot(eventId)
  const { mutate: update, isPending: updating } = useUpdateEventScheduleSlot(eventId)
  const { mutate: remove } = useDeleteEventScheduleSlot(eventId)
  const { mutate: cancel } = useCancelEventScheduleSlot(eventId)
  const { mutate: stopRecurrence } = useStopRecurrenceGroup(eventId)
  const { mutate: resumeRecurrence } = useResumeRecurrenceGroup(eventId)
  const { alert } = useConfirm()
  const { handleAction } = useAsyncAction()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<EventScheduleSlot | null>(null)
  const [viewingAttendeesSlot, setViewingAttendeesSlot] = useState<EventScheduleSlot | null>(null)
  const [loggingSlot, setLoggingSlot] = useState<EventScheduleSlot | null>(null)
  const [viewingSlot, setViewingSlot] = useState<EventScheduleSlot | null>(null)

  function handleOpenAdd() {
    setEditingSlot(null)
    setIsModalOpen(true)
  }

  function handleOpenEdit(slot: EventScheduleSlot) {
    setEditingSlot(slot)
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingSlot(null)
  }

  function handleOpenAttendees(slot: EventScheduleSlot) {
    setViewingAttendeesSlot(slot)
  }

  function handleOpenLogSession(slot: EventScheduleSlot) {
    setLoggingSlot(slot)
  }

  function handleSave(slotData: SlotSaveData) {
    if (editingSlot) {
      update(
        { slotId: editingSlot.id, data: slotData },
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setEditingSlot(null)
          },
          onError: (err) => {
            alert({ title: 'Update Failed', message: extractApiError(err) })
          },
        }
      )
    } else {
      create(slotData, {
        onSuccess: () => setIsModalOpen(false),
        onError: (err) => {
          alert({ title: 'Add Session Failed', message: extractApiError(err) })
        },
      })
    }
  }

  function handleRemoveSlot(slotId: string, info: string) {
    handleAction(remove, slotId, {
      title: 'Delete Session',
      message: `Are you sure you want to delete the session on ${info}?\n\nThis action cannot be undone.`,
      actionName: 'Delete',
    })
  }

  function handleRemoveSeries(group: ScheduleSeriesGroup) {
    const message = group.isRecurring
      ? `Are you sure you want to delete this entire series (${group.occurrenceCount} sessions)?\n\nThis will remove all occurrences in this group.`
      : `Are you sure you want to delete this session?`

    handleAction(
      async () => {
        for (const s of group.slots) {
          await remove(s.id)
        }
      },
      group.id,
      { title: 'Delete Series', message, actionName: 'Delete All' }
    )
  }

  function handleStopSeries(group: ScheduleSeriesGroup) {
    handleAction(stopRecurrence, group.id, {
      title: 'Stop Recurrence',
      message: `Are you sure you want to stop this recurring series?\n\nNo further slots will be automatically generated. Existing slots will remain.`,
      actionName: 'Stop Recurrence',
    })
  }

  function handleResumeSeries(group: ScheduleSeriesGroup) {
    handleAction(resumeRecurrence, group.id, {
      title: 'Resume Recurrence',
      message: `Are you sure you want to resume this recurring series?\n\nDynamic slot replenishment will resume generating future slots.`,
      actionName: 'Resume Recurrence',
    })
  }

  function handleCancelSlot(slot: EventScheduleSlot, info: string) {
    const bookingCount = slot._count?.bookings ?? 0
    const message =
      bookingCount > 0
        ? `Are you sure you want to cancel the session on ${info}? \n\nThis will cancel all ${bookingCount} active bookings and notify all participants. This action cannot be undone.`
        : `Are you sure you want to cancel the session on ${info}? \n\nThis will mark the session as cancelled and prevent new bookings.`

    handleAction(cancel, slot.id, {
      title: 'Cancel Session',
      message,
      actionName: 'Cancel Session',
    })
  }

  return {
    // state
    isModalOpen,
    editingSlot,
    viewingAttendeesSlot,
    loggingSlot,
    viewingSlot,
    isPending: creating || updating,
    // setters for simple state
    setViewingAttendeesSlot,
    setLoggingSlot,
    setViewingSlot,
    // handlers
    handleOpenAdd,
    handleOpenEdit,
    handleCloseModal,
    handleOpenAttendees,
    handleOpenLogSession,
    handleSave,
    handleRemoveSlot,
    handleRemoveSeries,
    handleStopSeries,
    handleResumeSeries,
    handleCancelSlot,
  }
}

import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Plus } from 'lucide-react'
import { Button } from '@/components/shared/ui/Button'
import { Spinner } from '@/components/shared/ui/Spinner'
import {
  useCreateEventScheduleSlot,
  useUpdateEventScheduleSlot,
  useDeleteEventScheduleSlot,
} from '@/hooks/queries/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import type { Event, EventScheduleSlot, TeamMember } from '@/types'
import { UpsertScheduleSlotDialog } from './dialogs/UpsertScheduleSlotDialog'
import { SlotAttendeesDialog } from './dialogs/SlotAttendeesDialog'
import { LogSessionDialog } from './dialogs/LogSessionDialog'
import { ScheduleSeriesTable, type ScheduleSeriesGroup } from './ScheduleSeriesTable'
import { ScheduleSeriesTrackerView } from './ScheduleSeriesTrackerView'

interface Props {
  event: Event
  slots: EventScheduleSlot[]
  isLoading: boolean
  teamMembers: TeamMember[]
}

export function EventScheduleSlotManager({ event, slots, isLoading, teamMembers }: Props) {
  const { mutate: create, isPending: creating } = useCreateEventScheduleSlot(event.id)
  const { mutate: update, isPending: updating } = useUpdateEventScheduleSlot(event.id)
  const { mutate: remove } = useDeleteEventScheduleSlot(event.id)
  const { handleAction } = useAsyncAction()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<EventScheduleSlot | null>(null)
  const [viewingAttendeesSlot, setViewingAttendeesSlot] = useState<EventScheduleSlot | null>(null)
  const [loggingSlot, setLoggingSlot] = useState<EventScheduleSlot | null>(null)
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null)

  // Grouping logic
  const seriesGroups = useMemo(() => {
    const groups: Record<string, ScheduleSeriesGroup> = {}

    slots.forEach((slot) => {
      const groupId = slot.recurrenceGroupId || `single-${slot.id}`
      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isRecurring: !!slot.recurrenceGroupId,
          occurrenceCount: 0,
          slots: [],
        }
      }
      groups[groupId].occurrenceCount++
      groups[groupId].slots.push(slot)

      if (new Date(slot.startTime) < new Date(groups[groupId].startTime)) {
        groups[groupId].startTime = slot.startTime
        groups[groupId].endTime = slot.endTime
      }
    })

    return Object.values(groups).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
  }, [slots])

  const activeSeries = useMemo(() => 
    seriesGroups.find(g => g.id === activeSeriesId),
    [seriesGroups, activeSeriesId]
  )

  function handleOpenAdd() {
    setEditingSlot(null)
    setIsModalOpen(true)
  }

  function handleOpenEdit(slot: EventScheduleSlot) {
    setEditingSlot(slot)
    setIsModalOpen(true)
  }

  function handleOpenAttendees(slot: EventScheduleSlot) {
    setViewingAttendeesSlot(slot)
  }

  function handleOpenLogSession(slot: EventScheduleSlot) {
    setLoggingSlot(slot)
  }

  function handleSave(slotData: {
    startTime: string
    endTime: string
    capacity: number | null
    assignedCoachId?: string | null
    recurrence?: any
  }) {
    if (editingSlot) {
      update(
        { slotId: editingSlot.id, data: slotData },
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setEditingSlot(null)
          },
        }
      )
    } else {
      create(slotData, {
        onSuccess: () => {
          setIsModalOpen(false)
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
        {
            title: 'Delete Series',
            message,
            actionName: 'Delete All',
        }
    )
  }

  if (isLoading) return <Spinner />

  return (
    <Box>
      {!activeSeries ? (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Scheduled Sessions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Recurring series are grouped for better visibility.
                </Typography>
            </Box>
            <Button size="sm" startIcon={<Plus size={16} />} onClick={handleOpenAdd}>
              Add Session
            </Button>
          </Stack>

          <ScheduleSeriesTable
            groups={seriesGroups}
            onViewTracker={(group) => setActiveSeriesId(group.id)}
            onRemoveSeries={handleRemoveSeries}
          />
        </>
      ) : (
        <ScheduleSeriesTrackerView
          event={event}
          group={activeSeries}
          onBack={() => setActiveSeriesId(null)}
          onEditSlot={handleOpenEdit}
          onRemoveSlot={handleRemoveSlot}
          onViewAttendees={handleOpenAttendees}
          onLogSession={handleOpenLogSession}
        />
      )}

      <UpsertScheduleSlotDialog
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingSlot(null)
        }}
        event={event}
        slot={editingSlot}
        onSave={handleSave}
        isPending={creating || updating}
        teamMembers={teamMembers}
      />

      <SlotAttendeesDialog
        isOpen={!!viewingAttendeesSlot}
        onClose={() => setViewingAttendeesSlot(null)}
        eventId={event.id}
        slot={viewingAttendeesSlot}
      />

      <LogSessionDialog
        isOpen={!!loggingSlot}
        onClose={() => setLoggingSlot(null)}
        eventId={event.id}
        slot={loggingSlot}
      />
    </Box>
  )
}

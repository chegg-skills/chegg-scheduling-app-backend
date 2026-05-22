import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import { Plus, LayoutList, Calendar as CalendarIcon } from 'lucide-react'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { alpha, useTheme } from '@mui/material/styles'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import { Button } from '@/components/shared/ui/Button'
import { Spinner } from '@/components/shared/ui/Spinner'
import {
  useCreateEventScheduleSlot,
  useUpdateEventScheduleSlot,
  useDeleteEventScheduleSlot,
  useCancelEventScheduleSlot,
} from '@/hooks/queries/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useScheduleSeriesGroups } from '@/hooks/useScheduleSeriesGroups'
import type { Event, EventScheduleSlot } from '@/types'
import { UpsertScheduleSlotDialog } from './dialogs/UpsertScheduleSlotDialog'
import { SlotAttendeesDialog } from './dialogs/SlotAttendeesDialog'
import { LogSessionDialog } from './dialogs/LogSessionDialog'
import { ScheduleSeriesTable, type ScheduleSeriesGroup } from './ScheduleSeriesTable'
import { ScheduleSeriesTrackerView } from './ScheduleSeriesTrackerView'
import { ScheduleCalendar } from './ScheduleCalendar'
import { useConfirm } from '@/context/confirm'
import { extractApiError } from '@/utils/apiError'
import { ScheduleSlotDetailModal } from './dialogs/ScheduleSlotDetailModal'

interface Props {
  event: Event
  slots: EventScheduleSlot[]
  isLoading: boolean
  canManage?: boolean
}

export function EventScheduleSlotManager({ event, slots, isLoading, canManage = true }: Props) {
  const theme = useTheme()
  const { mutate: create, isPending: creating } = useCreateEventScheduleSlot(event.id)
  const { mutate: update, isPending: updating } = useUpdateEventScheduleSlot(event.id)
  const { mutate: remove } = useDeleteEventScheduleSlot(event.id)
  const { mutate: cancel } = useCancelEventScheduleSlot(event.id)
  const { alert } = useConfirm()
  const { handleAction } = useAsyncAction()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSlot, setEditingSlot] = useState<EventScheduleSlot | null>(null)
  const [viewingAttendeesSlot, setViewingAttendeesSlot] = useState<EventScheduleSlot | null>(null)
  const [loggingSlot, setLoggingSlot] = useState<EventScheduleSlot | null>(null)
  const [activeSeriesId, setActiveSeriesId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [viewingSlot, setViewingSlot] = useState<EventScheduleSlot | null>(null)

  // Grouping logic
  const seriesGroups = useScheduleSeriesGroups(slots)

  const activeSeries = useMemo(
    () => seriesGroups.find((g) => g.id === activeSeriesId),
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
          onError: (err) => {
            alert({
              title: 'Update Failed',
              message: extractApiError(err),
            })
          },
        }
      )
    } else {
      create(slotData, {
        onSuccess: () => {
          setIsModalOpen(false)
        },
        onError: (err) => {
          alert({
            title: 'Add Session Failed',
            message: extractApiError(err),
          })
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

  if (isLoading) return <Spinner />

  return (
    <Box>
      {!activeSeries ? (
        <>
          <SectionHeader
            title="Scheduled Sessions"
            description="Recurring series are grouped for better visibility."
            action={
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(_, next) => next && setViewMode(next)}
                  size="small"
                  sx={{
                    bgcolor: 'background.paper',
                    '& .MuiToggleButton-root': {
                      px: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.12),
                        },
                      },
                    },
                  }}
                >
                  <ToggleButton value="list">
                    <LayoutList size={16} style={{ marginRight: 8 }} />
                    List
                  </ToggleButton>
                  <ToggleButton value="calendar">
                    <CalendarIcon size={16} style={{ marginRight: 8 }} />
                    Calendar
                  </ToggleButton>
                </ToggleButtonGroup>

                {canManage && (
                  <Button size="sm" startIcon={<Plus size={16} />} onClick={handleOpenAdd}>
                    Add Session
                  </Button>
                )}
              </Box>
            }
          />

          {viewMode === 'list' ? (
            <ScheduleSeriesTable
              groups={seriesGroups}
              onViewTracker={(group) => setActiveSeriesId(group.id)}
              onRemoveSeries={handleRemoveSeries}
              canManage={canManage}
            />
          ) : (
            <ScheduleCalendar slots={slots} onViewDetail={setViewingSlot} />
          )}
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
          onCancelSlot={handleCancelSlot}
          canManage={canManage}
        />
      )}

      <ScheduleSlotDetailModal
        slot={viewingSlot}
        event={event}
        onClose={() => setViewingSlot(null)}
        onEdit={handleOpenEdit}
        onRemove={handleRemoveSlot}
        onViewAttendees={handleOpenAttendees}
        onLogSession={handleOpenLogSession}
        onCancel={handleCancelSlot}
        canManage={canManage}
      />

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

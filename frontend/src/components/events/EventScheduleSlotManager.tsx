import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import { Plus, LayoutList, Calendar as CalendarIcon } from 'lucide-react'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { alpha, useTheme } from '@mui/material/styles'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import { Button } from '@/components/shared/ui/Button'
import { Spinner } from '@/components/shared/ui/Spinner'
import { useScheduleSeriesGroups } from '@/hooks/useScheduleSeriesGroups'
import type { Event, EventScheduleSlot } from '@/types'
import { UpsertScheduleSlotDialog } from './dialogs/UpsertScheduleSlotDialog'
import { SlotAttendeesDialog } from './dialogs/SlotAttendeesDialog'
import { LogSessionDialog } from './dialogs/LogSessionDialog'
import { ScheduleSeriesTable } from './ScheduleSeriesTable'
import { ScheduleSeriesTrackerView } from './ScheduleSeriesTrackerView'
import { ScheduleCalendar } from './ScheduleCalendar'
import { ScheduleSlotDetailModal } from './dialogs/ScheduleSlotDetailModal'
import { useSlotManagerActions } from './useSlotManagerActions'

interface Props {
  event: Event
  slots: EventScheduleSlot[]
  isLoading: boolean
  canManage?: boolean
}

export function EventScheduleSlotManager({ event, slots, isLoading, canManage = true }: Props) {
  const theme = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSeriesId = searchParams.get('series')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const seriesGroups = useScheduleSeriesGroups(slots)
  const activeSeries = useMemo(
    () => seriesGroups.find((g) => g.id === activeSeriesId),
    [seriesGroups, activeSeriesId]
  )

  const {
    isModalOpen,
    editingSlot,
    viewingAttendeesSlot,
    loggingSlot,
    viewingSlot,
    isPending,
    setViewingAttendeesSlot,
    setLoggingSlot,
    setViewingSlot,
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
  } = useSlotManagerActions(event.id)

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
              onViewTracker={(group) =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev)
                  next.set('series', group.id)
                  return next
                })
              }
              onRemoveSeries={handleRemoveSeries}
              onStopSeries={handleStopSeries}
              onResumeSeries={handleResumeSeries}
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
          onBack={() =>
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                next.delete('series')
                return next
              },
              { replace: true }
            )
          }
          onEditSlot={handleOpenEdit}
          onRemoveSlot={handleRemoveSlot}
          onViewAttendees={handleOpenAttendees}
          onLogSession={handleOpenLogSession}
          onCancelSlot={handleCancelSlot}
          onStopSeries={handleStopSeries}
          onResumeSeries={handleResumeSeries}
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
        onClose={handleCloseModal}
        event={event}
        slot={editingSlot}
        bookingCount={editingSlot?._count?.bookings ?? 0}
        onSave={handleSave}
        isPending={isPending}
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
        event={event}
      />
    </Box>
  )
}

import Skeleton from '@mui/material/Skeleton'
import Box from '@mui/material/Box'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { extractApiError } from '@/utils/apiError'
import { TeamStep } from '@/components/public/booking/TeamStep'
import { EventStep } from '@/components/public/booking/EventStep'
import { PreferredCoachStep } from '@/components/public/booking/PreferredCoachStep'
import { SlotStep } from '@/components/public/booking/SlotStep'
import { ConfirmationForm } from '@/components/public/booking/ConfirmationForm'
import type { BookingScope } from '@/pages/public/hooks/usePublicBookingState'
import { AvailableSlot } from '@/api/public'
import type { PublicTeamSummary, PublicEventSummary, PublicEventCoach } from '@/types'

import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'

function BookingSkeleton() {
  return (
    <Box sx={{ overflow: 'hidden', height: { lg: '100%' } }}>
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems="stretch"
        divider={
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', lg: 'block' } }} />
        }
        sx={{ height: '100%' }}
      >
        {/* Column 1: Calendar Picker Skeleton - matches SlotStep layout */}
        <Box sx={{ width: { xs: '100%', lg: 400 }, flexShrink: 0, p: 3 }}>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2, borderRadius: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={380} sx={{ borderRadius: 2 }} />
        </Box>

        {/* Column 2: Slot Selection Skeleton - matches Dashboard design */}
        <Box sx={{ flexGrow: 1, p: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Skeleton variant="text" width="60px" height={20} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="200px" height={32} />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: 1.5,
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={52} sx={{ borderRadius: 2 }} />
            ))}
          </Box>
        </Box>
      </Stack>
    </Box>
  )
}

interface PublicBookingFlowProps {
  currentStepKey: string | null
  scope: BookingScope
  teams: PublicTeamSummary[]
  loadingTeams: boolean
  teamsError: unknown
  selectedTeam: string | null
  handleTeamSelect: (id: string) => void
  visibleEvents: PublicEventSummary[]
  eventsLoading: boolean
  eventsError: unknown
  selectedEvent: string | null
  handleEventSelect: (id: string) => void
  eventDetailsError: unknown
  slots: AvailableSlot[]
  loadingSlots: boolean
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  selectedSlot: string | null
  setSelectedSlot: (slot: string | null) => void
  studentInfo: any
  setStudentInfo: (info: any) => void
  maxBookingWindowDays?: number | null
  isFixedSlots?: boolean
  availableDates?: Set<string>
  isLoadingDates?: boolean
  onMonthChange?: (date: Date) => void
  eventCoaches?: PublicEventCoach[]
  selectedCoachId?: string | null
  onCoachSelect?: (coachId: string) => void
  selectedTimezone: string
  setSelectedTimezone: (tz: string) => void
}

/**
 * PublicBookingFlow manages the conditional rendering of booking steps.
 */
export function PublicBookingFlow({
  currentStepKey,
  scope,
  teams,
  loadingTeams,
  teamsError,
  selectedTeam,
  handleTeamSelect,
  visibleEvents,
  eventsLoading,
  eventsError,
  selectedEvent,
  handleEventSelect,
  eventDetailsError,
  slots,
  loadingSlots,
  selectedDate,
  setSelectedDate,
  selectedSlot,
  setSelectedSlot,
  studentInfo,
  setStudentInfo,
  maxBookingWindowDays,
  isFixedSlots,
  availableDates,
  isLoadingDates,
  onMonthChange,
  eventCoaches,
  selectedCoachId,
  onCoachSelect,
  selectedTimezone,
  setSelectedTimezone,
}: PublicBookingFlowProps) {
  switch (currentStepKey) {
    case 'team':
      return (
        <TeamStep
          teams={teams}
          loading={loadingTeams}
          error={teamsError}
          selectedTeamId={selectedTeam}
          onSelect={handleTeamSelect}
          instruction={
            scope === 'coach'
              ? 'Select one of the coach’s teams to view their available sessions.'
              : undefined
          }
        />
      )
    case 'event':
      return (
        <EventStep
          events={visibleEvents}
          loading={eventsLoading}
          error={eventsError}
          emptyMessage={
            scope === 'coach'
              ? 'This coach does not currently have any public events.'
              : 'No events are available for this booking link.'
          }
          selectedEventId={selectedEvent}
          onSelect={handleEventSelect}
        />
      )
    case 'schedule':
      if (scope === 'event' && eventsLoading) {
        return <BookingSkeleton />
      }

      if (scope === 'event' && eventDetailsError) {
        const errorMsg = extractApiError(eventDetailsError)
        const isInactive =
          errorMsg.toLowerCase().includes('inactive') || errorMsg.toLowerCase().includes('paused')
        return (
          <Box
            sx={{
              p: 4,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh',
              width: '100%',
            }}
          >
            <Box sx={{ maxWidth: 500, width: '100%' }}>
              <ErrorAlert
                title={isInactive ? 'Scheduling Paused' : 'Invalid Booking Link'}
                message={errorMsg}
                severity={isInactive ? 'info' : 'error'}
              />
            </Box>
          </Box>
        )
      }

      if (!selectedEvent) {
        return (
          <Box
            sx={{
              p: 4,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '60vh',
              width: '100%',
            }}
          >
            <Box sx={{ maxWidth: 500, width: '100%' }}>
              <ErrorAlert message="Please select an event before choosing a time slot." />
            </Box>
          </Box>
        )
      }

      return (
        <SlotStep
          slots={slots}
          loading={loadingSlots}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          selectedSlot={selectedSlot}
          onSelect={setSelectedSlot}
          maxBookingWindowDays={maxBookingWindowDays}
          isFixedSlots={isFixedSlots}
          availableDates={availableDates}
          isLoadingDates={isLoadingDates}
          onMonthChange={onMonthChange}
          selectedTimezone={selectedTimezone}
          setSelectedTimezone={setSelectedTimezone}

        />
      )
    case 'preferred-coach':
      return (
        <PreferredCoachStep
          coaches={eventCoaches ?? []}
          selectedCoachId={selectedCoachId ?? null}
          onSelect={onCoachSelect ?? (() => {})}
        />
      )
    case 'preferred-coach':
      return (
        <PreferredCoachStep
          coaches={eventCoaches ?? []}
          selectedCoachId={selectedCoachId}
          onSelect={onCoachSelect ?? (() => {})}
        />
      )
    case 'confirm':
      return <ConfirmationForm studentInfo={studentInfo} onUpdate={setStudentInfo} />
    default:
      return null
  }
}

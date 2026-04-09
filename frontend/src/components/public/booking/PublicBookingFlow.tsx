import * as React from 'react'
import Typography from '@mui/material/Typography'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { TeamStep } from '@/components/public/booking/TeamStep'
import { EventStep } from '@/components/public/booking/EventStep'
import { SlotStep } from '@/components/public/booking/SlotStep'
import { ConfirmationForm } from '@/components/public/booking/ConfirmationForm'
import type { BookingScope } from '@/pages/public/hooks/usePublicBookingState'
import type { PublicTeamSummary, PublicEventSummary, PublicSlot } from '@/types'

interface PublicBookingFlowProps {
    currentStepKey: string | null
    scope: BookingScope
    teams: PublicTeamSummary[]
    loadingTeams: boolean
    teamsError: any
    selectedTeam: string | null
    handleTeamSelect: (id: string) => void
    visibleEvents: PublicEventSummary[]
    eventsLoading: boolean
    eventsError: any
    selectedEvent: string | null
    handleEventSelect: (id: string) => void
    eventDetailsError: any
    slots: PublicSlot[]
    loadingSlots: boolean
    selectedDate: Date
    setSelectedDate: (date: Date) => void
    selectedSlot: string | null
    setSelectedSlot: (slot: string | null) => void
    studentInfo: any
    setStudentInfo: (info: any) => void
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
    setStudentInfo
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
                return <Typography color="text.secondary">Loading event details...</Typography>
            }

            if (scope === 'event' && eventDetailsError) {
                return <ErrorAlert message="This public event link is invalid or no longer available." />
            }

            if (!selectedEvent) {
                return <ErrorAlert message="Please select an event before choosing a time slot." />
            }

            return (
                <SlotStep
                    slots={slots}
                    loading={loadingSlots}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    selectedSlot={selectedSlot}
                    onSelect={setSelectedSlot}
                />
            )
        case 'confirm':
            return (
                <ConfirmationForm
                    studentInfo={studentInfo}
                    onUpdate={setStudentInfo}
                />
            )
        default:
            return null
    }
}

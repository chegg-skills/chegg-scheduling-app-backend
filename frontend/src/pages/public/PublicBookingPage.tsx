import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { Calendar } from 'lucide-react'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import {
    usePublicCoachBySlug,
    usePublicCoachEventsBySlug,
    usePublicEventBySlug,
    usePublicSlots,
    usePublicTeamBySlug,
    usePublicTeamEvents,
    usePublicTeamEventsBySlug,
    usePublicTeams,
} from '@/hooks/usePublicBooking'
import { bookingsApi } from '@/api/bookings'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { TeamStep } from '@/components/public/booking/TeamStep'
import { EventStep } from '@/components/public/booking/EventStep'
import { SlotStep } from '@/components/public/booking/SlotStep'
import { ConfirmationForm } from '@/components/public/booking/ConfirmationForm'
import { SuccessStep } from '@/components/public/booking/SuccessStep'
import type { PublicEventSummary } from '@/types'

type BookingScope = 'directory' | 'team' | 'event' | 'coach'
type BookingStepKey = 'team' | 'event' | 'schedule' | 'confirm'

const stepLabels: Record<BookingStepKey, string> = {
    team: 'Team',
    event: 'Session',
    schedule: 'Schedule',
    confirm: 'Confirm',
}

const getBookingScope = (teamSlug?: string, eventSlug?: string, coachSlug?: string): BookingScope => {
    if (teamSlug) return 'team'
    if (eventSlug) return 'event'
    if (coachSlug) return 'coach'
    return 'directory'
}

const getStepKeysForScope = (scope: BookingScope): BookingStepKey[] => {
    switch (scope) {
        case 'team':
        case 'coach':
            return ['event', 'schedule', 'confirm']
        case 'event':
            return ['schedule', 'confirm']
        case 'directory':
        default:
            return ['team', 'event', 'schedule', 'confirm']
    }
}

export function PublicBookingPage() {
    const { teamSlug = '', eventSlug = '', coachSlug = '' } = useParams()
    const scope = getBookingScope(teamSlug, eventSlug, coachSlug)

    const [activeStep, setActiveStep] = useState(0)
    const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [studentInfo, setStudentInfo] = useState({
        name: '',
        email: '',
        notes: '',
        specificQuestion: '',
        triedSolutions: '',
        usedResources: '',
        sessionObjectives: '',
    })

    const { data: teams = [], isLoading: loadingTeams, error: teamsError } = usePublicTeams()
    const { data: directoryEvents = [], isLoading: loadingDirectoryEvents, error: directoryEventsError } = usePublicTeamEvents(selectedTeam || '')
    const { data: teamDetails, isLoading: loadingTeamDetails, error: teamDetailsError } = usePublicTeamBySlug(teamSlug)
    const { data: teamEventsResult, isLoading: loadingTeamEvents, error: teamEventsError } = usePublicTeamEventsBySlug(teamSlug)
    const { data: eventDetails, isLoading: loadingEventDetails, error: eventDetailsError } = usePublicEventBySlug(eventSlug)
    const { data: coachDetails, isLoading: loadingCoachDetails, error: coachDetailsError } = usePublicCoachBySlug(coachSlug)
    const { data: coachEventsResult, isLoading: loadingCoachEvents, error: coachEventsError } = usePublicCoachEventsBySlug(coachSlug)

    const stepKeys = useMemo(() => getStepKeysForScope(scope), [scope])
    const completionStep = stepKeys.length
    const currentStepKey = activeStep < completionStep ? stepKeys[activeStep] : null

    useEffect(() => {
        if (scope === 'team' && teamDetails?.id) {
            setSelectedTeam(teamDetails.id)
            setSelectedEvent(null)
            setSelectedSlot(null)
        }
    }, [scope, teamDetails?.id])

    useEffect(() => {
        if (scope === 'event' && eventDetails?.id) {
            setSelectedTeam(eventDetails.teamId)
            setSelectedEvent(eventDetails.id)
            setSelectedSlot(null)
        }
    }, [scope, eventDetails?.id, eventDetails?.teamId])

    useEffect(() => {
        if (scope === 'coach' && coachEventsResult?.events.length === 1) {
            const [singleEvent] = coachEventsResult.events
            setSelectedTeam(singleEvent.teamId)
            setSelectedEvent(singleEvent.id)
            setSelectedSlot(null)
        }
    }, [scope, coachEventsResult?.events])

    const visibleEvents = useMemo<PublicEventSummary[]>(() => {
        switch (scope) {
            case 'team':
                return teamEventsResult?.events ?? []
            case 'event':
                return eventDetails ? [eventDetails] : []
            case 'coach':
                return coachEventsResult?.events ?? []
            case 'directory':
            default:
                return directoryEvents
        }
    }, [coachEventsResult?.events, directoryEvents, eventDetails, scope, teamEventsResult?.events])

    const eventsLoading =
        scope === 'team'
            ? loadingTeamDetails || loadingTeamEvents
            : scope === 'event'
                ? loadingEventDetails
                : scope === 'coach'
                    ? loadingCoachDetails || loadingCoachEvents
                    : loadingDirectoryEvents

    const eventsError =
        scope === 'team'
            ? teamDetailsError || teamEventsError
            : scope === 'event'
                ? eventDetailsError
                : scope === 'coach'
                    ? coachDetailsError || coachEventsError
                    : directoryEventsError

    const heading = useMemo(() => {
        switch (scope) {
            case 'team':
                return teamDetails?.name ? `Book with ${teamDetails.name}` : 'Book with this team'
            case 'event':
                return eventDetails?.name ? `Book ${eventDetails.name}` : 'Book this session'
            case 'coach':
                return coachDetails
                    ? `Book with ${coachDetails.firstName} ${coachDetails.lastName}`
                    : 'Book with this coach'
            case 'directory':
            default:
                return 'Book a Session'
        }
    }, [coachDetails, eventDetails?.name, scope, teamDetails?.name])

    const subtitle = useMemo(() => {
        switch (scope) {
            case 'team':
                return 'Choose an event from this team and pick a convenient time.'
            case 'event':
                return 'Select a time slot to book this event directly.'
            case 'coach':
                return 'Choose an event offered by this coach and book a time directly with them.'
            case 'directory':
            default:
                return 'Find the perfect time to connect with our experts.'
        }
    }, [scope])

    const startDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
    ).toISOString()
    const endDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        23,
        59,
        59,
        999,
    ).toISOString()

    const preferredHostId = scope === 'coach' ? coachDetails?.id : undefined
    const { data: slots = [], isLoading: loadingSlots } = usePublicSlots(
        selectedEvent || '',
        startDate,
        endDate,
        preferredHostId,
    )

    const handleNext = () => setActiveStep((prev) => prev + 1)
    const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0))

    const handleTeamSelect = (teamId: string) => {
        setSelectedTeam(teamId)
        setSelectedEvent(null)
        setSelectedSlot(null)
        handleNext()
    }

    const handleEventSelect = (eventId: string) => {
        const matchingEvent = visibleEvents.find((event) => event.id === eventId)
        setSelectedEvent(eventId)
        setSelectedTeam(matchingEvent?.teamId ?? selectedTeam)
        setSelectedSlot(null)
        handleNext()
    }

    const handleBook = async () => {
        if (!selectedTeam || !selectedEvent || !selectedSlot) return

        setIsSubmitting(true)
        try {
            await bookingsApi.create({
                studentName: studentInfo.name,
                studentEmail: studentInfo.email,
                teamId: selectedTeam,
                eventId: selectedEvent,
                startTime: selectedSlot,
                notes: studentInfo.notes,
                specificQuestion: studentInfo.specificQuestion,
                triedSolutions: studentInfo.triedSolutions,
                usedResources: studentInfo.usedResources,
                sessionObjectives: studentInfo.sessionObjectives,
                preferredHostId,
            })
            handleNext()
        } catch (error) {
            console.error('Booking failed:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStepContent = () => {
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
                        emptyMessage={scope === 'coach' ? 'This coach does not currently have any public events.' : 'No events are available for this booking link.'}
                        selectedEventId={selectedEvent}
                        onSelect={handleEventSelect}
                    />
                )
            case 'schedule':
                if (scope === 'event' && loadingEventDetails) {
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
                        onNext={handleNext}
                    />
                )
            case 'confirm':
                return (
                    <ConfirmationForm
                        studentInfo={studentInfo}
                        isSubmitting={isSubmitting}
                        onUpdate={setStudentInfo}
                        onBack={handleBack}
                        onConfirm={handleBook}
                    />
                )
            default:
                return <SuccessStep email={studentInfo.email} onReset={() => window.location.reload()} />
        }
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ p: { xs: 2, sm: 4 } }}>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>{heading}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                    {subtitle}
                </Typography>

                {activeStep < completionStep && (
                    <Stepper activeStep={activeStep} sx={{ mb: 6 }} alternativeLabel>
                        {stepKeys.map((stepKey) => (
                            <Step key={stepKey}>
                                <StepLabel>{stepLabels[stepKey]}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                )}

                {renderStepContent()}

                {activeStep > 0 && activeStep < completionStep - 1 && (
                    <Box sx={{ mt: 4 }}>
                        <Button onClick={handleBack} startIcon={<Calendar size={18} />}>
                            Back to previous step
                        </Button>
                    </Box>
                )}
            </Box>
        </LocalizationProvider>
    )
}

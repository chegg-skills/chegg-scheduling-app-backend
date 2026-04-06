import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  usePublicTeams,
  usePublicTeamEvents,
  usePublicTeamBySlug,
  usePublicTeamEventsBySlug,
  usePublicEventBySlug,
  usePublicCoachBySlug,
  usePublicCoachEventsBySlug,
  usePublicSlots,
} from '@/hooks/usePublicBooking'
import { bookingsApi } from '@/api/bookings'
import type { PublicEventSummary } from '@/types'

export type BookingScope = 'directory' | 'team' | 'event' | 'coach'
export type BookingStepKey = 'team' | 'event' | 'schedule' | 'confirm'

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

export function usePublicBookingState() {
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
  const {
    data: directoryEvents = [],
    isLoading: loadingDirectoryEvents,
    error: directoryEventsError,
  } = usePublicTeamEvents(selectedTeam || '')

  const {
    data: teamDetails,
    isLoading: loadingTeamDetails,
    error: teamDetailsError,
  } = usePublicTeamBySlug(teamSlug)

  const {
    data: teamEventsResult,
    isLoading: loadingTeamEvents,
    error: teamEventsError,
  } = usePublicTeamEventsBySlug(teamSlug)

  const {
    data: eventDetails,
    isLoading: loadingEventDetails,
    error: eventDetailsError,
  } = usePublicEventBySlug(eventSlug)

  const {
    data: coachDetails,
    isLoading: loadingCoachDetails,
    error: coachDetailsError,
  } = usePublicCoachBySlug(coachSlug)

  const {
    data: coachEventsResult,
    isLoading: loadingCoachEvents,
    error: coachEventsError,
  } = usePublicCoachEventsBySlug(coachSlug)

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

  const preferredHostId = scope === 'coach' ? coachDetails?.id : undefined
  const startDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate()
  ).toISOString()
  const endDate = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    23,
    59,
    59,
    999
  ).toISOString()

  const { data: slots = [], isLoading: loadingSlots } = usePublicSlots(
    selectedEvent || '',
    startDate,
    endDate,
    preferredHostId
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
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    scope,
    activeStep,
    stepKeys,
    currentStepKey,
    completionStep,
    selectedTeam,
    selectedEvent,
    selectedDate,
    selectedSlot,
    isSubmitting,
    studentInfo,
    setStudentInfo,
    setSelectedDate,
    setSelectedSlot,
    teams,
    loadingTeams,
    teamsError,
    visibleEvents,
    eventsLoading,
    eventsError,
    slots,
    loadingSlots,
    handleNext,
    handleBack,
    handleTeamSelect,
    handleEventSelect,
    handleBook,
    teamDetails,
    eventDetails,
    coachDetails,
    eventDetailsError,
  }
}

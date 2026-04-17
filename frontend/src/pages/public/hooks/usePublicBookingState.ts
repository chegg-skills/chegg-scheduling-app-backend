import * as React from 'react'
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
} from '@/hooks/queries/usePublicBooking'
import { bookingsApi } from '@/api/bookings'
import type { PublicEventSummary } from '@/types'

export type BookingScope = 'directory' | 'team' | 'event' | 'coach'
export type BookingStepKey = 'team' | 'event' | 'schedule' | 'confirm'

const getBookingScope = (
  teamSlug?: string,
  eventSlug?: string,
  coachSlug?: string
): BookingScope => {
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

  const [activeStep, setActiveStep] = React.useState(0)
  const [selectedTeam, setSelectedTeam] = React.useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<string | null>(null)
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [studentInfo, setStudentInfo] = React.useState({
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
    data: teamDetailsFromSlug,
    isLoading: loadingTeamDetails,
    error: teamDetailsError,
  } = usePublicTeamBySlug(teamSlug)

  const {
    data: teamEventsResult,
    isLoading: loadingTeamEvents,
    error: teamEventsError,
  } = usePublicTeamEventsBySlug(teamSlug)

  const {
    data: eventDetailsFromSlug,
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

  const stepKeys = React.useMemo(() => getStepKeysForScope(scope), [scope])
  const completionStep = stepKeys.length
  const currentStepKey = activeStep < completionStep ? stepKeys[activeStep] : null

  const teamDetails = React.useMemo(() => {
    if (scope === 'team') return teamDetailsFromSlug
    if (selectedTeam) {
      return teams.find((t) => t.id === selectedTeam) || null
    }
    return null
  }, [scope, teamDetailsFromSlug, selectedTeam, teams])

  React.useEffect(() => {
    if (scope === 'team' && teamDetailsFromSlug?.id) {
      setSelectedTeam(teamDetailsFromSlug.id)
      setSelectedEvent(null)
      setSelectedSlot(null)
    }
  }, [scope, teamDetailsFromSlug?.id])

  React.useEffect(() => {
    if (scope === 'event' && eventDetailsFromSlug?.id) {
      setSelectedTeam(eventDetailsFromSlug.teamId)
      setSelectedEvent(eventDetailsFromSlug.id)
      setSelectedSlot(null)
    }
  }, [scope, eventDetailsFromSlug?.id, eventDetailsFromSlug?.teamId])

  React.useEffect(() => {
    if (scope === 'coach' && coachEventsResult?.events.length === 1) {
      const [singleEvent] = coachEventsResult.events
      setSelectedTeam(singleEvent.teamId)
      setSelectedEvent(singleEvent.id)
      setSelectedSlot(null)
    }
  }, [scope, coachEventsResult?.events])

  const visibleEvents = React.useMemo<PublicEventSummary[]>(() => {
    switch (scope) {
      case 'team':
        return teamEventsResult?.events ?? []
      case 'event':
        return eventDetailsFromSlug ? [eventDetailsFromSlug] : []
      case 'coach':
        return coachEventsResult?.events ?? []
      case 'directory':
      default:
        return directoryEvents
    }
  }, [
    coachEventsResult?.events,
    directoryEvents,
    eventDetailsFromSlug,
    scope,
    teamEventsResult?.events,
  ])

  const eventsLoading =
    scope === 'team'
      ? loadingTeamDetails || loadingTeamEvents
      : scope === 'event'
        ? loadingEventDetails
        : scope === 'coach'
          ? loadingCoachDetails || loadingCoachEvents
          : loadingDirectoryEvents

  const eventDetails = React.useMemo(() => {
    if (scope === 'event') return eventDetailsFromSlug
    if (selectedEvent) {
      return visibleEvents.find((e) => e.id === selectedEvent) || null
    }
    return null
  }, [scope, eventDetailsFromSlug, selectedEvent, visibleEvents])

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

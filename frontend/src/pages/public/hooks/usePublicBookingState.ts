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
  usePublicSlotDates,
  usePublicGroupBySlug,
  usePublicGroupEventsBySlug,
} from '@/hooks/queries/usePublicBooking'
import { bookingsApi } from '@/api/bookings'
import type { PublicEventSummary } from '@/types'
import { startOfDayInTimezone } from '@/utils/dateTimezone'

export type BookingScope = 'directory' | 'team' | 'event' | 'coach' | 'group'
export type BookingStepKey = 'team' | 'event' | 'schedule' | 'confirm'

const getBookingScope = (
  teamSlug?: string,
  eventSlug?: string,
  coachSlug?: string,
  groupSlug?: string
): BookingScope => {
  if (teamSlug) return 'team'
  if (eventSlug) return 'event'
  if (coachSlug) return 'coach'
  if (groupSlug) return 'group'
  return 'directory'
}


export function usePublicBookingState() {
  const { teamSlug = '', eventSlug = '', coachSlug = '', groupSlug = '' } = useParams()
  const scope = getBookingScope(teamSlug, eventSlug, coachSlug, groupSlug)

  const [activeStep, setActiveStep] = React.useState(0)
  const [selectedTeam, setSelectedTeam] = React.useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = React.useState<string | null>(null)
  const [selectedDate, setSelectedDate] = React.useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null)
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(new Date())
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [selectedCoachId, setSelectedCoachId] = React.useState<string | null>(null)
  const [selectedTimezone, setSelectedTimezone] = React.useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )
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

  const {
    data: groupDetailsFromSlug,
    isLoading: loadingGroupDetails,
    error: groupDetailsError,
  } = usePublicGroupBySlug(groupSlug)

  const {
    data: groupEventsResult,
    isLoading: loadingGroupEvents,
    error: groupEventsError,
  } = usePublicGroupEventsBySlug(groupSlug)

  const coachTeams = React.useMemo(() => {
    if (scope !== 'coach') return []
    const seen = new Set<string>()
    return (coachEventsResult?.events ?? [])
      .map((e) => e.team)
      .filter((t) => {
        if (seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
  }, [scope, coachEventsResult?.events])

  const coachTeamsCount = coachTeams.length

  const visibleEvents = React.useMemo<PublicEventSummary[]>(() => {
    switch (scope) {
      case 'team':
        return teamEventsResult?.events ?? []
      case 'group':
        return groupEventsResult?.events ?? []
      case 'event':
        return eventDetailsFromSlug ? [eventDetailsFromSlug] : []
      case 'coach':
        if (coachTeamsCount > 1) {
          return selectedTeam
            ? (coachEventsResult?.events ?? []).filter((e) => e.teamId === selectedTeam)
            : []
        }
        return coachEventsResult?.events ?? []
      case 'directory':
      default:
        return directoryEvents
    }
  }, [
    coachEventsResult?.events,
    coachTeamsCount,
    directoryEvents,
    eventDetailsFromSlug,
    scope,
    selectedTeam,
    teamEventsResult?.events,
    groupEventsResult?.events,
  ])

  const stepKeys = React.useMemo<BookingStepKey[]>(() => {
    switch (scope) {
      case 'coach':
        if (coachTeamsCount > 1) {
          if (selectedTeam) {
            const teamEvents = (coachEventsResult?.events ?? []).filter((e) => e.teamId === selectedTeam)
            if (teamEvents.length === 1) {
              return ['team', 'schedule', 'confirm']
            }
          }
          return ['team', 'event', 'schedule', 'confirm']
        } else {
          const coachEvents = coachEventsResult?.events ?? []
          return coachEvents.length === 1
            ? ['schedule', 'confirm']
            : ['event', 'schedule', 'confirm']
        }
      case 'team':
      case 'group':
        return visibleEvents.length === 1
          ? ['schedule', 'confirm']
          : ['event', 'schedule', 'confirm']
      case 'event':
        return ['schedule', 'confirm']
      case 'directory':
      default:
        return ['team', 'event', 'schedule', 'confirm']
    }
  }, [scope, coachTeamsCount, selectedTeam, coachEventsResult?.events, visibleEvents.length])

  const completionStep = stepKeys.length
  const currentStepKey = activeStep < completionStep ? stepKeys[activeStep] : null

  const teamDetails = React.useMemo(() => {
    if (scope === 'team') return teamDetailsFromSlug
    if (scope === 'group') return groupDetailsFromSlug?.team || null
    if (selectedTeam) {
      const pool = scope === 'coach' ? coachTeams : teams
      return pool.find((t) => t.id === selectedTeam) || null
    }
    return null
  }, [scope, teamDetailsFromSlug, groupDetailsFromSlug?.team, selectedTeam, teams, coachTeams])

  React.useEffect(() => {
    if (scope === 'team' && teamDetailsFromSlug?.id) {
      setSelectedTeam(teamDetailsFromSlug.id)
      setSelectedEvent(null)
      setSelectedSlot(null)
    }
  }, [scope, teamDetailsFromSlug?.id])

  React.useEffect(() => {
    if (scope === 'group' && groupDetailsFromSlug?.teamId) {
      setSelectedTeam(groupDetailsFromSlug.teamId)
      setSelectedEvent(null)
      setSelectedSlot(null)
    }
  }, [scope, groupDetailsFromSlug?.teamId])

  React.useEffect(() => {
    if (scope === 'event' && eventDetailsFromSlug?.id) {
      setSelectedTeam(eventDetailsFromSlug.teamId)
      setSelectedEvent(eventDetailsFromSlug.id)
      setSelectedSlot(null)
    }
  }, [scope, eventDetailsFromSlug?.id, eventDetailsFromSlug?.teamId])

  React.useEffect(() => {
    if (scope === 'coach' && coachTeamsCount === 1 && !selectedTeam) {
      setSelectedTeam(coachTeams[0].id)
    }
  }, [scope, coachTeamsCount, coachTeams, selectedTeam])

  React.useEffect(() => {
    if (visibleEvents.length === 1 && !selectedEvent) {
      const [singleEvent] = visibleEvents
      setSelectedEvent(singleEvent.id)
      if (!selectedTeam) {
        setSelectedTeam(singleEvent.teamId)
      }
      setSelectedSlot(null)
    }
  }, [visibleEvents, selectedEvent, selectedTeam])

  const eventsLoading =
    scope === 'team'
      ? loadingTeamDetails || loadingTeamEvents
      : scope === 'group'
        ? loadingGroupDetails || loadingGroupEvents
        : scope === 'event'
          ? loadingEventDetails || (!selectedEvent && !eventDetailsError)
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
      : scope === 'group'
        ? groupDetailsError || groupEventsError
        : scope === 'event'
          ? eventDetailsError
          : scope === 'coach'
            ? coachDetailsError || coachEventsError
            : directoryEventsError

  // Reset selectedCoachId and selectedSlot when the selected event changes
  React.useEffect(() => {
    setSelectedCoachId(null)
    setSelectedSlot(null)
  }, [selectedEvent])

  // Reset selectedSlot when the chosen coach changes
  React.useEffect(() => {
    setSelectedSlot(null)
  }, [selectedCoachId])

  const preferredCoachId =
    scope === 'coach'
      ? coachDetails?.id
      : eventDetails?.allowStudentCoachChoice
        ? (selectedCoachId ?? undefined)
        : undefined
  const startDate = startOfDayInTimezone(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
    selectedTimezone
  ).toISOString()
  const endDate = new Date(
    startOfDayInTimezone(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate() + 1,
      selectedTimezone
    ).getTime() - 1
  ).toISOString()

  const { data: slots = [], isLoading: loadingSlots } = usePublicSlots(
    selectedEvent || '',
    startDate,
    endDate,
    preferredCoachId,
    selectedTimezone
  )

  const isFixedSlots = eventDetails?.bookingMode === 'FIXED_SLOTS'
  const { availableDates, isLoading: isLoadingDates } = usePublicSlotDates(
    selectedEvent || '',
    calendarMonth,
    isFixedSlots,
    preferredCoachId,
    selectedTimezone
  )

  const handleMonthChange = React.useCallback((date: Date) => {
    setCalendarMonth(date)
  }, [])

  const selectedSlotCoach = React.useMemo(() => {
    if (!selectedSlot || !slots.length) return null
    const slot = slots.find((s) => s.startTime === selectedSlot)
    return slot?.assignedCoach || null
  }, [selectedSlot, slots])

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
        timezone: selectedTimezone,
        notes: studentInfo.notes,
        specificQuestion: studentInfo.specificQuestion,
        triedSolutions: studentInfo.triedSolutions,
        usedResources: studentInfo.usedResources,
        sessionObjectives: studentInfo.sessionObjectives,
        preferredCoachId,
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
    teams: scope === 'coach' ? coachTeams : teams,
    loadingTeams: scope === 'coach' ? loadingCoachEvents : loadingTeams,
    teamsError: scope === 'coach' ? coachEventsError : teamsError,
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
    selectedSlotCoach,
    eventDetailsError,
    isFixedSlots,
    availableDates,
    isLoadingDates,
    handleMonthChange,
    selectedCoachId,
    setSelectedCoachId,
    selectedTimezone,
    setSelectedTimezone,
  }
}

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
} from '@/hooks/queries/usePublicBooking'
import { bookingsApi } from '@/api/bookings'
import type { PublicEventSummary } from '@/types'

export type BookingScope = 'directory' | 'team' | 'event' | 'coach'
export type BookingStepKey = 'team' | 'event' | 'schedule' | 'confirm'

function startOfDayInTimezone(year: number, month: number, day: number, tz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parseHMS = (utcMs: number) => {
    const s = fmt.format(new Date(utcMs)) // 'YYYY-MM-DD, HH:MM:SS'
    const [h, m, sec] = s.split(', ')[1].split(':').map(Number)
    return { h: h % 24, m, sec } // h%24 handles rare '24:00' edge in some environments
  }
  // Start from noon UTC — guaranteed to be on the correct calendar day for any timezone (UTC-12..+14)
  let utcMs = Date.UTC(year, month, day, 12, 0, 0)
  // Pass 1: subtract local HMS from noon to land near local midnight
  const { h: h1, m: m1, sec: s1 } = parseHMS(utcMs)
  utcMs -= (h1 * 3600 + m1 * 60 + s1) * 1000
  // Pass 2: correct for DST transition days where noon's offset ≠ midnight's offset
  const { h: h2, m: m2, sec: s2 } = parseHMS(utcMs)
  if (h2 !== 0 || m2 !== 0 || s2 !== 0) {
    if (h2 > 12) {
      // Overshot backward into previous-day evening — advance to midnight
      utcMs += (24 - h2) * 3_600_000 - m2 * 60_000 - s2 * 1000
    } else {
      // Landed slightly past midnight — subtract the remainder
      utcMs -= (h2 * 3600 + m2 * 60 + s2) * 1000
    }
  }
  return new Date(utcMs)
}

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
    preferredCoachId
  )

  const isFixedSlots = eventDetails?.bookingMode === 'FIXED_SLOTS'
  const { availableDates, isLoading: isLoadingDates } = usePublicSlotDates(
    selectedEvent || '',
    calendarMonth,
    isFixedSlots,
    preferredCoachId
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


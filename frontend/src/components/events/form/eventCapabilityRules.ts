import type { AssignmentStrategy, InteractionTypeCaps } from '@/types'

type CoachSetupStatusInput = {
  activeCoachCount: number
  assignmentStrategy?: AssignmentStrategy | null
  minCoachCount: number
}

export function getAllowedAssignmentStrategies(
  caps?: InteractionTypeCaps | null
): AssignmentStrategy[] {
  // If caps is not provided yet, default to DIRECT
  if (!caps) return ['DIRECT']

  // ONE_TO_MANY logic: only supports DIRECT assignment per user request.
  // Other types support round-robin — multipleCoaches means multiple coaches
  // *simultaneously in a session*, not that the pool can only have one coach.
  const allStrategies: AssignmentStrategy[] = ['DIRECT', 'ROUND_ROBIN']

  // Logic: ONE_TO_MANY doesn't support round robin as sessions are pre-defined
  // and participants join a fixed host/coach.
  const isOneToMany = !caps.multipleCoaches && caps.multipleParticipants

  if (isOneToMany) {
    return ['DIRECT']
  }

  return allStrategies
}

export function getDefaultEventAssignmentStrategy(
  caps?: InteractionTypeCaps | null
): AssignmentStrategy {
  return getAllowedAssignmentStrategies(caps)[0] ?? 'DIRECT'
}

export function getRequiredEventCoachCount(
  _caps: InteractionTypeCaps | null | undefined,
  assignmentStrategy?: AssignmentStrategy | null
): number {
  const roundRobinMinimum = assignmentStrategy === 'ROUND_ROBIN' ? 2 : 1
  return roundRobinMinimum
}

export function getEventCoachSetupStatus({
  activeCoachCount,
  assignmentStrategy,
  minCoachCount,
}: CoachSetupStatusInput) {
  const roundRobinMinimum = assignmentStrategy === 'ROUND_ROBIN' ? 2 : 1
  const requiredCoaches = Math.max(minCoachCount, roundRobinMinimum)
  const missingCoaches = Math.max(requiredCoaches - activeCoachCount, 0)
  const isReady = missingCoaches === 0

  return {
    isReady,
    requiredCoaches,
    missingCoaches,
    message: isReady
      ? null
      : assignmentStrategy === 'ROUND_ROBIN'
        ? `This round-robin event needs ${missingCoaches} more coach${missingCoaches === 1 ? '' : 'es'} before bookings can rotate correctly.`
        : `This event needs ${missingCoaches} more coach${missingCoaches === 1 ? '' : 'es'} to satisfy the minimum requirement of ${requiredCoaches}.`,
  }
}

export function formatCapacityRange(minimum: number, maximum: number | null): string {
  return maximum === null ? `${minimum} – No cap` : `${minimum} – ${maximum}`
}

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function getLocalPartsInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hourCycle: 'h23',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }
  return {
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
    totalMinutes: parseInt(get('hour')) * 60 + parseInt(get('minute')),
  }
}

/**
 * Checks if a specific date (ISO string or Date object) is allowed based on the event's weekday configuration.
 * Uses the event's timezone so day-of-week boundaries are correct regardless of server or browser timezone.
 */
export function isWeekdayAllowed(
  date: string | Date,
  allowedWeekdays: number[],
  weeklyAvailability?: Array<{ dayOfWeek: number }>,
  timezone = 'UTC',
): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  if (weeklyAvailability && weeklyAvailability.length > 0) {
    const { dayOfWeek } = getLocalPartsInTimezone(d, timezone)
    return weeklyAvailability.some((a) => a.dayOfWeek === dayOfWeek)
  }
  if (allowedWeekdays.length === 0) return true
  const { dayOfWeek } = getLocalPartsInTimezone(d, timezone)
  return allowedWeekdays.includes(dayOfWeek)
}

/**
 * Checks if a specific date and time range is within the event's weekly availability.
 * Uses the event's timezone so HH:mm window boundaries are interpreted correctly.
 */
export function isSlotWithinAvailability(
  date: string | Date,
  durationSeconds: number,
  weeklyAvailability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
  timezone = 'UTC',
): boolean {
  if (!weeklyAvailability || weeklyAvailability.length === 0) return true

  const startTime = typeof date === 'string' ? new Date(date) : date
  const endTime = new Date(startTime.getTime() + durationSeconds * 1000)
  const startLocal = getLocalPartsInTimezone(startTime, timezone)
  const endLocal = getLocalPartsInTimezone(endTime, timezone)
  const dayRanges = weeklyAvailability.filter((a) => a.dayOfWeek === startLocal.dayOfWeek)

  if (dayRanges.length === 0) return false

  return dayRanges.some((range) => {
    const [rsh, rsm] = range.startTime.split(':').map(Number)
    const [reh, rem] = range.endTime.split(':').map(Number)
    return startLocal.totalMinutes >= rsh * 60 + rsm && endLocal.totalMinutes <= reh * 60 + rem
  })
}

/**
 * Returns a human-readable list of allowed weekdays (e.g., "Tuesday, Friday").
 */
export function formatAllowedWeekdays(
  allowedWeekdays: number[],
  weeklyAvailability?: Array<{ dayOfWeek: number }>
): string {
  if (weeklyAvailability && weeklyAvailability.length > 0) {
    const days = Array.from(new Set(weeklyAvailability.map((a) => a.dayOfWeek))).sort()
    return days.map((d) => WEEKDAY_NAMES[d]).join(', ')
  }

  if (allowedWeekdays.length === 0) return 'All days'
  return allowedWeekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')
}

/**
 * Returns a human-readable list of allowed time ranges for a specific day.
 * Uses the event's timezone so day-of-week lookup is correct.
 */
export function formatAvailabilityRanges(
  date: string | Date,
  weeklyAvailability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
  timezone = 'UTC',
): string {
  if (!weeklyAvailability || weeklyAvailability.length === 0) return 'Any time'

  const d = typeof date === 'string' ? new Date(date) : date
  const { dayOfWeek } = getLocalPartsInTimezone(d, timezone)
  const dayRanges = weeklyAvailability.filter((a) => a.dayOfWeek === dayOfWeek)

  if (dayRanges.length === 0) return 'No availability defined for this day'

  return dayRanges.map((r) => `${r.startTime} – ${r.endTime}`).join(', ')
}

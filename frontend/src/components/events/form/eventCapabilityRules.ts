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

/**
 * Checks if a specific date (ISO string or Date object) is allowed based on the event's weekday configuration.
 */
export function isWeekdayAllowed(
  date: string | Date,
  allowedWeekdays: number[],
  weeklyAvailability?: Array<{ dayOfWeek: number }>
): boolean {
  // If we have granular weekly availability, that takes precedence
  if (weeklyAvailability && weeklyAvailability.length > 0) {
    const d = typeof date === 'string' ? new Date(date) : date
    const day = d.getDay()
    return weeklyAvailability.some((a) => a.dayOfWeek === day)
  }

  // Fallback to simple allowedWeekdays
  if (allowedWeekdays.length === 0) return true
  const d = typeof date === 'string' ? new Date(date) : date
  return allowedWeekdays.includes(d.getDay())
}

/**
 * Checks if a specific date and time range is within the event's weekly availability.
 */
export function isSlotWithinAvailability(
  date: string | Date,
  durationSeconds: number,
  weeklyAvailability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
): boolean {
  if (!weeklyAvailability || weeklyAvailability.length === 0) return true

  const startTime = typeof date === 'string' ? new Date(date) : date
  const day = startTime.getDay()
  const dayRanges = weeklyAvailability.filter((a) => a.dayOfWeek === day)

  if (dayRanges.length === 0) return false

  const startHour = startTime.getHours()
  const startMin = startTime.getMinutes()
  
  // Calculate end time
  const endTime = new Date(startTime.getTime() + durationSeconds * 1000)
  const endHour = endTime.getHours()
  const endMin = endTime.getMinutes()

  const slotStartTotalMins = startHour * 60 + startMin
  const slotEndTotalMins = endHour * 60 + endMin

  return dayRanges.some((range) => {
    const [rsh, rsm] = range.startTime.split(':').map(Number)
    const [reh, rem] = range.endTime.split(':').map(Number)
    const rangeStartTotalMins = rsh * 60 + rsm
    const rangeEndTotalMins = reh * 60 + rem

    return slotStartTotalMins >= rangeStartTotalMins && slotEndTotalMins <= rangeEndTotalMins
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
 */
export function formatAvailabilityRanges(
  date: string | Date,
  weeklyAvailability?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
): string {
  if (!weeklyAvailability || weeklyAvailability.length === 0) return 'Any time'
  
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDay()
  const dayRanges = weeklyAvailability.filter((a) => a.dayOfWeek === day)
  
  if (dayRanges.length === 0) return 'No availability defined for this day'
  
  return dayRanges.map(r => `${r.startTime} – ${r.endTime}`).join(', ')
}

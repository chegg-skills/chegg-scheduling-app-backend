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
export function isWeekdayAllowed(date: string | Date, allowedWeekdays: number[]): boolean {
  if (allowedWeekdays.length === 0) return true
  const d = typeof date === 'string' ? new Date(date) : date
  return allowedWeekdays.includes(d.getDay())
}

/**
 * Returns a human-readable list of allowed weekdays (e.g., "Tuesday, Friday").
 */
export function formatAllowedWeekdays(allowedWeekdays: number[]): string {
  if (allowedWeekdays.length === 0) return 'All days'
  return allowedWeekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')
}

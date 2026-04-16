import type { AssignmentStrategy, EventInteractionType } from '@/types'

type ParticipantConfig = {
  minParticipantCount?: number | null
  maxParticipantCount?: number | null
}

type HostSetupStatusInput = {
  activeHostCount: number
  assignmentStrategy?: AssignmentStrategy | null
  interactionType?: EventInteractionType | null
}

export function getAllowedAssignmentStrategies(
  interactionType?: EventInteractionType | null
): AssignmentStrategy[] {
  return interactionType?.supportsRoundRobin ? ['DIRECT', 'ROUND_ROBIN'] : ['DIRECT']
}

export function getDefaultEventAssignmentStrategy(
  interactionType?: EventInteractionType | null
): AssignmentStrategy {
  return getAllowedAssignmentStrategies(interactionType)[0] ?? 'DIRECT'
}

export function clampEventParticipantConfig(
  interactionType: EventInteractionType | null | undefined,
  currentConfig: ParticipantConfig
): Required<ParticipantConfig> {
  if (!interactionType) {
    return {
      minParticipantCount: currentConfig.minParticipantCount ?? null,
      maxParticipantCount: currentConfig.maxParticipantCount ?? null,
    }
  }

  let minParticipantCount = Math.max(
    interactionType.minParticipants,
    currentConfig.minParticipantCount ?? interactionType.minParticipants
  )

  let maxParticipantCount =
    currentConfig.maxParticipantCount ?? interactionType.maxParticipants ?? null

  if (interactionType.maxParticipants !== null) {
    maxParticipantCount =
      maxParticipantCount === null
        ? interactionType.maxParticipants
        : Math.min(maxParticipantCount, interactionType.maxParticipants)
  }

  if (maxParticipantCount !== null && maxParticipantCount < minParticipantCount) {
    minParticipantCount = maxParticipantCount
  }

  return {
    minParticipantCount,
    maxParticipantCount,
  }
}

export function formatCapacityRange(minimum: number, maximum: number | null): string {
  return maximum === null ? `${minimum} – No cap` : `${minimum} – ${maximum}`
}

export function getRequiredEventHostCount(
  interactionType?: EventInteractionType | null,
  assignmentStrategy?: AssignmentStrategy | null
): number {
  const interactionMinimum = interactionType?.minHosts ?? 1
  const roundRobinMinimum = assignmentStrategy === 'ROUND_ROBIN' ? 2 : 1
  return Math.max(interactionMinimum, roundRobinMinimum)
}

export function getEventHostSetupStatus({
  activeHostCount,
  assignmentStrategy,
  interactionType,
}: HostSetupStatusInput) {
  const requiredHosts = getRequiredEventHostCount(interactionType, assignmentStrategy)
  const missingHosts = Math.max(requiredHosts - activeHostCount, 0)
  const isReady = missingHosts === 0

  return {
    isReady,
    requiredHosts,
    missingHosts,
    message: isReady
      ? null
      : assignmentStrategy === 'ROUND_ROBIN'
        ? `This round-robin event needs ${missingHosts} more host${missingHosts === 1 ? '' : 's'} before bookings can rotate correctly.`
        : `This event needs ${missingHosts} more host${missingHosts === 1 ? '' : 's'} to satisfy the interaction type minimum of ${requiredHosts}.`,
  }
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

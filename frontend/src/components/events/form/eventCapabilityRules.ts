import type { AssignmentStrategy, InteractionTypeCaps } from '@/types'

type CoachSetupStatusInput = {
  activeCoachCount: number
  assignmentStrategy?: AssignmentStrategy | null
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
}: CoachSetupStatusInput) {
  const requiredCoaches = assignmentStrategy === 'ROUND_ROBIN' ? 2 : 1
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
        : `This event needs at least ${requiredCoaches} coach${requiredCoaches === 1 ? '' : 'es'}.`,
  }
}

export function formatCapacityRange(minimum: number, maximum: number | null): string {
  return maximum === null ? `${minimum} – No cap` : `${minimum} – ${maximum}`
}


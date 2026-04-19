import Alert from '@mui/material/Alert'
import { getEventCoachSetupStatus } from './form/eventCapabilityRules'

interface EventCoachStatusAlertProps {
  activeCoachCount: number
  assignmentStrategy: string
  minCoachCount: number
}

export function EventCoachStatusAlert({
  activeCoachCount,
  assignmentStrategy,
  minCoachCount,
}: EventCoachStatusAlertProps) {
  const coachSetupStatus = getEventCoachSetupStatus({
    activeCoachCount,
    assignmentStrategy: assignmentStrategy === 'ROUND_ROBIN' ? 'ROUND_ROBIN' : 'DIRECT',
    minCoachCount,
  })

  if (coachSetupStatus.isReady) return null

  return (
    <Alert severity="warning" variant="outlined">
      {coachSetupStatus.message} Add at least {coachSetupStatus.requiredCoaches} eligible coach
      {coachSetupStatus.requiredCoaches === 1 ? '' : 'es'} to make this event ready.
    </Alert>
  )
}

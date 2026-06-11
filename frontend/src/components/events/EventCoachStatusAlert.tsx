import Alert from '@mui/material/Alert'
import { getEventCoachSetupStatus } from './form/eventCapabilityRules'

interface EventCoachStatusAlertProps {
  activeCoachCount: number
  assignmentStrategy: string
}

export function EventCoachStatusAlert({
  activeCoachCount,
  assignmentStrategy,
}: EventCoachStatusAlertProps) {
  const coachSetupStatus = getEventCoachSetupStatus({
    activeCoachCount,
    assignmentStrategy: assignmentStrategy === 'ROUND_ROBIN' ? 'ROUND_ROBIN' : 'DIRECT',
  })

  if (coachSetupStatus.isReady) return null

  return (
    <Alert severity="warning" variant="outlined">
      {coachSetupStatus.message} Add at least {coachSetupStatus.requiredCoaches} eligible coach
      {coachSetupStatus.requiredCoaches === 1 ? '' : 'es'} to make this event ready.
    </Alert>
  )
}

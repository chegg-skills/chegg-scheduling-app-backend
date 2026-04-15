import Alert from '@mui/material/Alert'
import { getEventHostSetupStatus } from './eventCapabilityRules'

interface EventHostStatusAlertProps {
  activeHostCount: number
  assignmentStrategy: string
  interactionType: { minHosts: number } | null
}

export function EventHostStatusAlert({
  activeHostCount,
  assignmentStrategy,
  interactionType,
}: EventHostStatusAlertProps) {
  const hostSetupStatus = getEventHostSetupStatus({
    activeHostCount,
    assignmentStrategy: assignmentStrategy === 'ROUND_ROBIN' ? 'ROUND_ROBIN' : 'DIRECT',
    interactionType: interactionType ? ({ minHosts: interactionType.minHosts } as any) : null,
  })

  if (hostSetupStatus.isReady) return null

  return (
    <Alert severity="warning" variant="outlined">
      {hostSetupStatus.message} Add at least {hostSetupStatus.requiredHosts} eligible coach
      {hostSetupStatus.requiredHosts === 1 ? '' : 'es'} to make this event ready.
    </Alert>
  )
}

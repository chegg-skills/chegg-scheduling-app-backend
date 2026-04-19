import Alert from '@mui/material/Alert'
import type { InteractionTypeCaps } from '@/types'

interface EventAssignmentAlertProps {
  caps: InteractionTypeCaps | null
  requiredCoachCount: number
  selectedAssignmentStrategy: string
  bookingModeSelection?: string
}

export function EventAssignmentAlert({
  caps,
  requiredCoachCount,
  selectedAssignmentStrategy,
  bookingModeSelection,
}: EventAssignmentAlertProps) {
  if (!caps) return null

  return (
    <Alert severity="info" variant="standard" sx={{ mt: 2 }}>
      <strong>Note:</strong> After saving, assign at least {requiredCoachCount} coach
      {requiredCoachCount === 1 ? '' : 'es'}
      {selectedAssignmentStrategy === 'ROUND_ROBIN'
        ? ' so round-robin routing can work.'
        : ' for this event configuration.'}
      {bookingModeSelection === 'FIXED_SLOTS' &&
        ' Because fixed-slot mode is enabled, add one or more schedule slots on the event detail page as the final setup step.'}
    </Alert>
  )
}

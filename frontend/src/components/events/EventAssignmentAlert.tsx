import Alert from '@mui/material/Alert'
import type { EventInteractionType } from '@/types'

interface EventAssignmentAlertProps {
    selectedInteractionType: EventInteractionType | null
    requiredHostCount: number
    selectedAssignmentStrategy: string
    bookingModeSelection?: string
}

export function EventAssignmentAlert({
    selectedInteractionType,
    requiredHostCount,
    selectedAssignmentStrategy,
    bookingModeSelection,
}: EventAssignmentAlertProps) {
    if (!selectedInteractionType) return null

    return (
        <Alert severity="info" variant="outlined">
            After saving, assign at least <strong>{requiredHostCount} host{requiredHostCount === 1 ? '' : 's'}</strong>
            {selectedAssignmentStrategy === 'ROUND_ROBIN' ? ' so round-robin routing can work.' : ' for this event configuration.'}
            {bookingModeSelection === 'FIXED_SLOTS' ? ' Because fixed-slot mode is enabled, add one or more schedule slots on the event detail page as the final setup step.' : ''}
        </Alert>
    )
}

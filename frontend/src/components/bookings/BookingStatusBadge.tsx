import { Badge, BadgeColor } from '@/components/shared/ui/Badge'
import type { BookingStatus } from '@/types'

interface Props {
  status: BookingStatus
}

export function BookingStatusBadge({ status }: Props) {
  const getStatusConfig = (s: BookingStatus): { label: string; color: BadgeColor } => {
    switch (s) {
      case 'CONFIRMED':
        return { label: 'Confirmed', color: 'green' }
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'red' }
      case 'COMPLETED':
        return { label: 'Completed', color: 'blue' }
      case 'NO_SHOW':
        return { label: 'No Show', color: 'yellow' }
      default:
        return { label: s, color: 'gray' }
    }
  }

  const { label, color } = getStatusConfig(status)

  return <Badge label={label} color={color} sx={{ fontWeight: 600, minWidth: 90 }} />
}

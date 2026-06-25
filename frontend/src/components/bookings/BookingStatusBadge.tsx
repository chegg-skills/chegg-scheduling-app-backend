import { Badge, BadgeColor } from '@/components/shared/ui/Badge'
import type { BookingStatus } from '@/types'

interface Props {
  status: BookingStatus
  useAttendanceLabels?: boolean
}

export function BookingStatusBadge({ status, useAttendanceLabels }: Props) {
  const getStatusConfig = (s: BookingStatus): { label: string; color: BadgeColor } => {
    switch (s) {
      case 'CONFIRMED':
        return { label: 'Confirmed', color: 'green' }
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'red' }
      case 'COMPLETED':
        return { label: useAttendanceLabels ? 'Present' : 'Completed', color: useAttendanceLabels ? 'green' : 'blue' }
      case 'NO_SHOW':
        return { label: useAttendanceLabels ? 'Absent' : 'No Show', color: useAttendanceLabels ? 'red' : 'yellow' }
      default:
        return { label: s, color: 'gray' }
    }
  }

  const { label, color } = getStatusConfig(status)

  return <Badge label={label} color={color} sx={{ fontWeight: 600, minWidth: 90 }} />
}

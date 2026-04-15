import Chip from '@mui/material/Chip'
import type { BookingStatus } from '@/types'

interface Props {
  status: BookingStatus
}

export function BookingStatusBadge({ status }: Props) {
  const getStatusConfig = (s: BookingStatus) => {
    switch (s) {
      case 'CONFIRMED':
        return { label: 'Confirmed', color: 'success' as const }
      case 'CANCELLED':
        return { label: 'Cancelled', color: 'error' as const }
      case 'COMPLETED':
        return { label: 'Completed', color: 'info' as const }
      case 'NO_SHOW':
        return { label: 'No Show', color: 'warning' as const }
      default:
        return { label: s, color: 'default' as const }
    }
  }

  const { label, color } = getStatusConfig(status)

  return <Chip label={label} color={color} size="small" sx={{ fontWeight: 600, minWidth: 80 }} />
}

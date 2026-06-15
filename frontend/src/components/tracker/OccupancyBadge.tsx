import Chip from '@mui/material/Chip'

interface OccupancyBadgeProps {
  bookingCount: number
  capacity: number | null
  status: 'OPEN' | 'FULL'
}

export function OccupancyBadge({ bookingCount, capacity, status }: OccupancyBadgeProps) {
  if (capacity === null) {
    return (
      <Chip
        label={`${bookingCount} booked`}
        size="small"
        sx={{ bgcolor: 'grey.100', color: 'text.secondary', fontWeight: 600 }}
      />
    )
  }

  const fillPct = capacity > 0 ? bookingCount / capacity : 1

  if (status === 'FULL') {
    return (
      <Chip
        label={`Full (${bookingCount} / ${capacity})`}
        size="small"
        color="error"
        sx={{ fontWeight: 600 }}
      />
    )
  }

  if (fillPct >= 0.5) {
    return (
      <Chip
        label={`${bookingCount} / ${capacity}`}
        size="small"
        color="warning"
        sx={{ fontWeight: 600 }}
      />
    )
  }

  return (
    <Chip
      label={`${bookingCount} / ${capacity}`}
      size="small"
      color="success"
      sx={{ fontWeight: 600 }}
    />
  )
}

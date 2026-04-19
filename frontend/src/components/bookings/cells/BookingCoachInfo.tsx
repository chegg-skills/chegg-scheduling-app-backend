import Typography from '@mui/material/Typography'
import type { SafeUser } from '@/types'
import { useBookingView } from '@/context/bookingView'

interface BookingCoachInfoProps {
  coach?: SafeUser | null
}

export function BookingCoachInfo({ coach }: BookingCoachInfoProps) {
  const { onViewCoach } = useBookingView()

  if (!coach) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        N/A
      </Typography>
    )
  }

  return (
    <Typography
      variant="body2"
      onClick={() => onViewCoach?.(coach.id)}
      sx={{
        fontWeight: 600,
        color: 'text.secondary',
        textDecoration: 'none',
        cursor: onViewCoach ? 'pointer' : 'default',
        '&:hover': {
          color: onViewCoach ? 'primary.main' : 'inherit',
          textDecoration: onViewCoach ? 'underline' : 'none',
        },
      }}
    >
      {coach.firstName} {coach.lastName}
    </Typography>
  )
}

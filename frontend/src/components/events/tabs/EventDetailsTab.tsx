import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import { EventDetailOverview } from '../EventDetailOverview'
import type { Event } from '@/types'

interface EventDetailsTabProps {
  event: Event
  coachSetupStatus: { isReady: boolean; message: string | null }
  needsScheduleSlots: boolean
}

export function EventDetailsTab({
  event,
  coachSetupStatus,
  needsScheduleSlots,
}: EventDetailsTabProps) {
  return (
    <Stack spacing={2}>
      {!coachSetupStatus.isReady && (
        <Alert severity="warning" variant="standard" sx={{ mt: 2 }}>
          {coachSetupStatus.message}
        </Alert>
      )}
      {needsScheduleSlots && (
        <Alert severity="info" variant="standard" sx={{ mt: 2 }}>
          This event is in fixed-slot mode, so add one or more schedule slots before sharing it for
          booking.
        </Alert>
      )}
      <EventDetailOverview event={event} />
    </Stack>
  )
}

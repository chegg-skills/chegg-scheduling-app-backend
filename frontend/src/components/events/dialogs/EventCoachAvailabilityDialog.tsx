import { useState, useEffect } from 'react'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { WeeklyAvailabilityPicker } from '@/components/availability/WeeklyAvailabilityPicker'
import { useEventCoachAvailability, useSetEventCoachAvailability } from '@/hooks/queries/useEvents'
import type { EventCoach, SetWeeklyAvailabilityDto } from '@/types'

interface EventCoachAvailabilityDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  coach: EventCoach | null
}

export function EventCoachAvailabilityDialog({
  isOpen,
  onClose,
  eventId,
  coach,
}: EventCoachAvailabilityDialogProps) {
  const coachUserId = coach?.coachUserId ?? ''
  const coachName = coach
    ? `${coach.coachUser.firstName} ${coach.coachUser.lastName}`
    : ''

  const { data: savedSlots, isLoading } = useEventCoachAvailability(eventId, coachUserId, isOpen && !!coachUserId)
  const { mutate: saveAvailability, isPending, isError, error } = useSetEventCoachAvailability(eventId, coachUserId)

  const [slots, setSlots] = useState<SetWeeklyAvailabilityDto>([])

  useEffect(() => {
    if (savedSlots) {
      setSlots(savedSlots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })))
    }
  }, [savedSlots])

  const handleSave = () => {
    saveAvailability(slots, {
      onSuccess: () => onClose(),
    })
  }

  const handleClear = () => {
    saveAvailability([], {
      onSuccess: () => onClose(),
    })
  }

  const hasOverride = (savedSlots?.length ?? 0) > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Event Schedule — ${coachName}`}
      maxWidth="sm"
    >
      <Stack spacing={3}>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Set custom availability for <strong>{coachName}</strong> on this event only. When set,
            these hours replace their global profile schedule for slot generation. Leave all days
            empty to clear the override and fall back to their global schedule.
          </Typography>
          {hasOverride && (
            <Chip
              label="Custom schedule active"
              color="primary"
              size="small"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          {!hasOverride && !isLoading && (
            <Chip
              label="Using global schedule"
              size="small"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
        </Stack>

        {isError && (
          <Alert severity="error">
            {(error as any)?.response?.data?.message || 'Failed to save availability.'}
          </Alert>
        )}

        <WeeklyAvailabilityPicker value={slots} onChange={setSlots} disabled={isLoading || isPending} showFooter={false} />

        <Stack direction="row" justifyContent="space-between" spacing={2}>
          {hasOverride && (
            <Button variant="outlined" color="error" onClick={handleClear} isLoading={isPending}>
              Clear override
            </Button>
          )}
          <Stack direction="row" spacing={2} sx={{ ml: 'auto' }}>
            <Button variant="outlined" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isPending}>
              Save schedule
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Modal>
  )
}

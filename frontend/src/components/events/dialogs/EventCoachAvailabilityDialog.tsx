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
    setSlots(
      savedSlots
        ? savedSlots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }))
        : []
    )
  }, [savedSlots, coachUserId])

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
      title={`Event Availability — ${coachName}`}
      size="sm"
    >
      <Stack spacing={3}>
        <Stack spacing={1.5}>
          <Alert severity="info">
            This custom availability will override <strong>{coachName}</strong>'s global profile schedule for this event.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Set custom availability for <strong>{coachName}</strong> on this event only. When set,
            these hours replace their global profile availability for slot generation. Leave all days
            empty to clear the override and fall back to their global availability.
          </Typography>
          {hasOverride && (
            <Chip
              label="Custom availability active"
              color="primary"
              size="small"
              variant="outlined"
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
          {!hasOverride && !isLoading && (
            <Chip
              label="Using global availability"
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
            <Button variant="danger" onClick={handleClear} isLoading={isPending}>
              Clear override
            </Button>
          )}
          <Stack direction="row" spacing={2} sx={{ ml: 'auto' }}>
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} isLoading={isPending}>
              Save availability
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Modal>
  )
}

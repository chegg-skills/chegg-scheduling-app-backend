import { useState, useEffect } from 'react'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Calendar, Globe } from 'lucide-react'
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
      <Stack spacing={2.5}>
        <Alert severity="info" sx={{ borderRadius: 1.5 }}>
          Set custom availability for <strong>{coachName}</strong> on this event only. These hours will override their global profile schedule for slot generation. Leave all days empty to fall back to their global availability.
        </Alert>

        {/* Override status */}
        <Stack direction="row" alignItems="center" spacing={0.75}>
          {hasOverride ? (
            <>
              <Calendar size={13} style={{ color: 'var(--mui-palette-primary-main, #1976d2)', flexShrink: 0 }} />
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                Custom availability active
              </Typography>
            </>
          ) : !isLoading ? (
            <>
              <Globe size={13} style={{ opacity: 0.55, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">
                Using global availability
              </Typography>
            </>
          ) : null}
        </Stack>

        {isError && (
          <Alert severity="error" sx={{ borderRadius: 1.5 }}>
            {(error as any)?.response?.data?.message || 'Failed to save availability.'}
          </Alert>
        )}

        <WeeklyAvailabilityPicker
          value={slots}
          onChange={setSlots}
          disabled={isLoading || isPending}
          showFooter={false}
          condensed
        />

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          {hasOverride && (
            <Button variant="danger" onClick={handleClear} isLoading={isPending} sx={{ mr: 'auto' }}>
              Clear override
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isPending}>
            Save availability
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}

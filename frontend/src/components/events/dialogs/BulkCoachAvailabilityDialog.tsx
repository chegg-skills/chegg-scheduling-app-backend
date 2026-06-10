import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { WeeklyAvailabilityPicker } from '@/components/availability/WeeklyAvailabilityPicker'
import { eventsApi } from '@/api/events'
import { eventKeys } from '@/hooks/queries/useEvents'
import type { EventCoach, SetWeeklyAvailabilityDto } from '@/types'

interface BulkCoachAvailabilityDialogProps {
  isOpen: boolean
  onClose: () => void
  eventId: string
  coaches: EventCoach[]
}

type ApplyMode = 'unset' | 'all'

export function BulkCoachAvailabilityDialog({
  isOpen,
  onClose,
  eventId,
  coaches,
}: BulkCoachAvailabilityDialogProps) {
  const [slots, setSlots] = useState<SetWeeklyAvailabilityDto>([])
  const [mode, setMode] = useState<ApplyMode>('unset')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()

  const unsetCoaches = coaches.filter((c) => (c.weeklyAvailabilityOverride ?? []).length === 0)
  const targetCoaches = mode === 'unset' ? unsetCoaches : coaches

  const handleClose = () => {
    setSlots([])
    setMode('unset')
    setError(null)
    onClose()
  }

  const handleSave = async () => {
    if (targetCoaches.length === 0) return
    setIsPending(true)
    setError(null)
    const results = await Promise.allSettled(
      targetCoaches.map((c) => eventsApi.setCoachAvailability(eventId, c.coachUserId, slots))
    )
    await qc.invalidateQueries({ queryKey: eventKeys.coaches(eventId) })
    setIsPending(false)
    const failed = results
      .map((r, i) =>
        r.status === 'rejected'
          ? `${targetCoaches[i].coachUser.firstName} ${targetCoaches[i].coachUser.lastName}`
          : null
      )
      .filter(Boolean) as string[]
    if (failed.length > 0) {
      setError(`Failed to update: ${failed.join(', ')}`)
      return
    }
    handleClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Set bulk schedule" size="md">
      <Stack spacing={3}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Apply the same custom availability to multiple coaches on this event.
          </Typography>

          <Stack direction="row" spacing={1}>
            <Chip
              label={`New coaches only (${unsetCoaches.length})`}
              onClick={() => setMode('unset')}
              color={mode === 'unset' ? 'primary' : 'default'}
              variant={mode === 'unset' ? 'filled' : 'outlined'}
              size="small"
              clickable
            />
            <Chip
              label={`All coaches (${coaches.length})`}
              onClick={() => setMode('all')}
              color={mode === 'all' ? 'primary' : 'default'}
              variant={mode === 'all' ? 'filled' : 'outlined'}
              size="small"
              clickable
            />
          </Stack>

          {mode === 'all' && unsetCoaches.length < coaches.length && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              This will overwrite existing custom schedules for{' '}
              {coaches.length - unsetCoaches.length} coach
              {coaches.length - unsetCoaches.length > 1 ? 'es' : ''}.
            </Alert>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              Applying to {targetCoaches.length} coach{targetCoaches.length !== 1 ? 'es' : ''}:
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {targetCoaches.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  All coaches already have a custom schedule. Switch to "All coaches" to overwrite.
                </Typography>
              ) : (
                targetCoaches.map((c) => (
                  <Stack key={c.coachUserId} direction="row" spacing={0.5} alignItems="center">
                    <Avatar sx={{ width: 20, height: 20, fontSize: '0.625rem', bgcolor: 'primary.light', color: 'primary.dark' }}>
                      {c.coachUser.firstName[0]}{c.coachUser.lastName[0]}
                    </Avatar>
                    <Typography variant="caption">
                      {c.coachUser.firstName} {c.coachUser.lastName}
                    </Typography>
                  </Stack>
                ))
              )}
            </Stack>
          </Box>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <WeeklyAvailabilityPicker value={slots} onChange={setSlots} disabled={isPending} showFooter={false} />

        {slots.length === 0 && targetCoaches.length > 0 && (
          <Alert severity="info" sx={{ py: 0.5 }}>
            Saving with no days selected will clear the custom schedule for the coaches below,
            reverting them to their global profile availability.
          </Alert>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2}>
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isPending}
            disabled={targetCoaches.length === 0}
          >
            {slots.length === 0
              ? `Clear override for ${targetCoaches.length} coach${targetCoaches.length !== 1 ? 'es' : ''}`
              : `Apply to ${targetCoaches.length} coach${targetCoaches.length !== 1 ? 'es' : ''}`}
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}

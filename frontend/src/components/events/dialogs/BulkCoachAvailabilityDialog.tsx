import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { WeeklyAvailabilityPicker } from '@/components/availability/WeeklyAvailabilityPicker'
import { eventsApi } from '@/api/events'
import { eventKeys } from '@/hooks/queries/useEvents'
import type { EventCoach, SetWeeklyAvailabilityDto } from '@/types'
import { Users } from 'lucide-react'

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
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            Apply the same custom availability to multiple coaches on this event.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box
              onClick={() => setMode('unset')}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: mode === 'unset' ? 'primary.main' : 'divider',
                boxShadow: mode === 'unset'
                  ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}`
                  : 'none',
                bgcolor: mode === 'unset' ? '#FFF6F0' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: '#FFF6F0',
                },
              }}
            >
              <Typography variant="body2" fontWeight={600} color={mode === 'unset' ? 'primary.main' : 'text.primary'}>
                New coaches only ({unsetCoaches.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Apply only to coaches who do not have any custom schedules configured.
              </Typography>
            </Box>

            <Box
              onClick={() => setMode('all')}
              sx={{
                flex: 1,
                p: 1.5,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: mode === 'all' ? 'primary.main' : 'divider',
                boxShadow: mode === 'all'
                  ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}`
                  : 'none',
                bgcolor: mode === 'all' ? '#FFF6F0' : 'background.paper',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: '#FFF6F0',
                },
              }}
            >
              <Typography variant="body2" fontWeight={600} color={mode === 'all' ? 'primary.main' : 'text.primary'}>
                All coaches ({coaches.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Apply to all assigned coaches, overwriting any event-specific overrides.
              </Typography>
            </Box>
          </Stack>

          {mode === 'all' && unsetCoaches.length < coaches.length && (
            <Alert severity="warning" sx={{ borderRadius: 1.5, py: 0.5, fontSize: '0.8rem' }}>
              This will overwrite existing custom schedules for{' '}
              {coaches.length - unsetCoaches.length} coach
              {coaches.length - unsetCoaches.length > 1 ? 'es' : ''}.
            </Alert>
          )}

          <Box
            sx={{
              p: 1.25,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              bgcolor: 'action.hover',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1, color: 'text.secondary' }}>
              <Users size={16} />
              <Typography variant="caption" fontWeight={600}>
                Applying to {targetCoaches.length} coach{targetCoaches.length !== 1 ? 'es' : ''}:
              </Typography>
            </Stack>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {targetCoaches.length === 0 ? (
                <Typography variant="caption" color="text.disabled">
                  All coaches already have a custom schedule. Switch to "All coaches" to overwrite.
                </Typography>
              ) : (
                targetCoaches.map((c) => (
                  <Box
                    key={c.coachUserId}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Avatar sx={{ width: 18, height: 18, fontSize: '0.625rem', bgcolor: 'primary.light', color: 'primary.dark' }}>
                      {c.coachUser.firstName[0]}{c.coachUser.lastName[0]}
                    </Avatar>
                    <Typography variant="caption" fontWeight={500} color="text.primary">
                      {c.coachUser.firstName} {c.coachUser.lastName}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Stack>

        {error && <Alert severity="error" sx={{ borderRadius: 1.5, py: 0.5, fontSize: '0.8rem' }}>{error}</Alert>}

        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1.5,
            p: 1.25,
            bgcolor: 'background.paper',
          }}
        >
          <WeeklyAvailabilityPicker value={slots} onChange={setSlots} disabled={isPending} showFooter={false} condensed />
        </Box>

        {slots.length === 0 && targetCoaches.length > 0 && (
          <Alert severity="info" sx={{ borderRadius: 1.5, py: 0.5, fontSize: '0.8rem' }}>
            Saving with no days selected will clear the custom schedule for the coaches below,
            reverting them to their global profile availability.
          </Alert>
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 1 }}>
          <Button variant="secondary" onClick={handleClose} disabled={isPending} sx={{ borderRadius: 1.5 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            isLoading={isPending}
            disabled={targetCoaches.length === 0}
            sx={{ borderRadius: 1.5 }}
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

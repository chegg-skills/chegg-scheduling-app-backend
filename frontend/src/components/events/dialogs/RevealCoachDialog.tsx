import { useState } from 'react'
import { format } from 'date-fns'
import Alert from '@mui/material/Alert'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Select } from '@/components/shared/form/Select'
import { Input } from '@/components/shared/form/Input'
import { useRevealCoach, useCoachAvailabilityForSlot } from '@/hooks/queries/useEvents'
import type { Event, EventScheduleSlot } from '@/types'

interface RevealCoachDialogProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  slot: EventScheduleSlot | null
}

export function RevealCoachDialog({ isOpen, onClose, event, slot }: RevealCoachDialogProps) {
  const slotId = slot?.id ?? ''
  const { mutate: revealCoach, isPending } = useRevealCoach(event.id, slotId)
  const { data: coachAvailability, isLoading: isLoadingAvailability } = useCoachAvailabilityForSlot(
    event.id,
    slotId,
    isOpen && !!slotId
  )

  const preAssignedCoachId = slot?.assignedCoachId ?? null
  const [selectedCoachId, setSelectedCoachId] = useState<string>(preAssignedCoachId ?? '')
  const [customJoinUrl, setCustomJoinUrl] = useState<string>('')

  if (!slot) return null

  const startFormatted = format(new Date(slot.startTime), 'EEE, MMM d @ h:mm a')
  const participantCount = slot._count?.bookings ?? 0

  // Fall back to event.coaches (no availability info) while the query loads
  const coachList =
    coachAvailability ??
    event.coaches.map((ec) => ({
      coachUserId: ec.coachUserId,
      coachUser: ec.coachUser,
      isAvailable: true,
      conflicts: [] as any[],
    }))

  const handleSend = () => {
    revealCoach(
      {
        coachUserId: selectedCoachId || undefined,
        sessionJoinUrl: customJoinUrl.trim() || null,
      },
      {
        onSuccess: () => {
          onClose()
        },
      }
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send Coach Reveal"
      size="sm"
      footer={
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSend} disabled={isPending || !selectedCoachId}>
            {isPending ? 'Sending…' : `Send to ${participantCount} participant(s)`}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            <strong>Session:</strong> {event.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Time:</strong> {startFormatted}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Participants:</strong> {participantCount}
          </Typography>
        </Stack>

        <Alert severity="info">
          Sending the reveal will email all booked participants with the coach name and join link.
          This action cannot be undone.
        </Alert>

        <FormField
          label="Coach"
          htmlFor="reveal-coach"
          info={
            preAssignedCoachId
              ? 'This slot has a pre-assigned coach. You can change it before sending.'
              : 'Select the coach who will host this session.'
          }
        >
          <Select
            id="reveal-coach"
            value={selectedCoachId}
            onChange={(e) => setSelectedCoachId(e.target.value as string)}
          >
            <MenuItem value="">
              <em>Select a coach</em>
            </MenuItem>
            {isLoadingAvailability ? (
              <MenuItem disabled>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={14} />
                  <span>Checking availability…</span>
                </Stack>
              </MenuItem>
            ) : (
              coachList.map((c: any) => (
                <MenuItem key={c.coachUserId} value={c.coachUserId} sx={{ py: 1.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    width="100%"
                    spacing={2}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        src={c.coachUser.avatarUrl}
                        sx={{ width: 32, height: 32, fontSize: '0.875rem' }}
                      >
                        {c.coachUser.firstName[0]}
                        {c.coachUser.lastName[0]}
                      </Avatar>
                      <Stack spacing={0.25}>
                        <Typography variant="body2" fontWeight={600}>
                          {c.coachUser.firstName} {c.coachUser.lastName}
                          {c.coachUserId === preAssignedCoachId && (
                            <Typography
                              component="span"
                              variant="caption"
                              color="primary.main"
                              sx={{ ml: 1, fontWeight: 400 }}
                            >
                              (pre-assigned)
                            </Typography>
                          )}
                        </Typography>
                        {!c.isAvailable && (c.conflicts?.length ?? 0) > 0 && (
                          <Typography
                            variant="caption"
                            color="error.main"
                            sx={{ display: 'block' }}
                          >
                            Conflict: {c.conflicts[0]?.eventName} (
                            {format(new Date(c.conflicts[0]?.startTime), 'h:mm a')})
                          </Typography>
                        )}
                      </Stack>
                    </Stack>

                    <Chip
                      label={c.isAvailable ? 'Available' : 'Conflict'}
                      size="small"
                      color={c.isAvailable ? 'success' : 'error'}
                      variant={c.isAvailable ? 'outlined' : 'filled'}
                      sx={{
                        pointerEvents: 'none',
                        minWidth: 70,
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Stack>
                </MenuItem>
              ))
            )}
          </Select>
        </FormField>

        <FormField
          label="Custom Join URL (optional)"
          htmlFor="reveal-join-url"
          info="Leave blank to use the coach's Zoom link or the event location. Enter a URL to override."
        >
          <Input
            id="reveal-join-url"
            type="url"
            placeholder="https://..."
            value={customJoinUrl}
            onChange={(e) => setCustomJoinUrl(e.target.value)}
          />
        </FormField>
      </Stack>
    </Modal>
  )
}

import { format } from 'date-fns'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { useCoachAvailabilityForSlot, useRevealCoach } from '@/hooks/queries/useEvents'
import type { Event, EventScheduleSlot } from '@/types'

interface RevealCoachDialogProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  slot: EventScheduleSlot | null
}

// Mirrors backend/src/domain/bookings/booking.shared.ts's getMeetingJoinUrl — this is a
// preview of what that function will resolve, not a second source of truth. Keep both in sync.
function resolveJoinLinkPreview(
  event: Pick<Event, 'meetingLinkSource' | 'locationValue'>,
  coachZoomLink: string | null | undefined
): string | null {
  if (event.meetingLinkSource === 'EVENT_LOCATION') {
    return event.locationValue || coachZoomLink || null
  }
  return coachZoomLink || event.locationValue || null
}

export function RevealCoachDialog({ isOpen, onClose, event, slot }: RevealCoachDialogProps) {
  const slotId = slot?.id ?? ''
  const { mutate: revealCoach, isPending } = useRevealCoach(event.id, slotId)
  const { data: coachAvailability } = useCoachAvailabilityForSlot(event.id, slotId, isOpen && !!slotId)

  if (!slot) return null

  const startFormatted = format(new Date(slot.startTime), 'EEE, MMM d @ h:mm a')
  const participantCount = slot._count?.bookings ?? 0

  const coachList =
    coachAvailability ??
    event.coaches.map((ec) => ({ coachUserId: ec.coachUserId, coachUser: ec.coachUser }))

  const assignedCoach = slot.assignedCoachId
    ? coachList.find((c) => c.coachUserId === slot.assignedCoachId)
    : undefined

  const joinLinkPreview = assignedCoach
    ? resolveJoinLinkPreview(event, assignedCoach.coachUser.zoomIsvLink)
    : null

  const coachName = assignedCoach
    ? `${assignedCoach.coachUser.firstName} ${assignedCoach.coachUser.lastName}`
    : null

  // Should be unreachable going forward — DIRECT ONE_TO_MANY events now require a default
  // host, and every new slot is assigned one at creation time. Kept as a defensive state for
  // slots created before that guarantee existed, pointing at the real fix (Edit Session).
  const blockedReason = !slot.assignedCoachId
    ? 'This slot has no assigned coach. Assign one via Edit Session before revealing.'
    : !joinLinkPreview
      ? 'This coach has no Zoom link on file. Add one to their profile before revealing.'
      : null

  const handleSend = () => {
    revealCoach({}, { onSuccess: () => onClose() })
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
          <Button variant="primary" onClick={handleSend} disabled={isPending || !!blockedReason}>
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
          <Typography variant="body2" color="text.secondary">
            <strong>Coach:</strong> {coachName ?? 'Not assigned'}
          </Typography>
          {joinLinkPreview && (
            <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              <strong>Join link:</strong> {joinLinkPreview}
            </Typography>
          )}
        </Stack>

        {blockedReason ? (
          <Alert severity="warning">{blockedReason}</Alert>
        ) : (
          <Alert severity="info">
            This will immediately email the coach's name and join link to all {participantCount}{' '}
            currently booked participant(s). It also permanently reveals the coach for this time
            slot — any student who books this same slot afterward will see the coach's name and
            join link right away in their confirmation email, without waiting for a reveal.
          </Alert>
        )}
      </Stack>
    </Modal>
  )
}

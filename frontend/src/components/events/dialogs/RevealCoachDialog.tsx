import { useState } from 'react'
import { format } from 'date-fns'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Modal } from '@/components/shared/ui/Modal'
import { Button } from '@/components/shared/ui/Button'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { SearchableCoachAvailabilityList } from '@/components/events/SearchableCoachAvailabilityList'
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
          label="Select Coach to Reveal"
          htmlFor="reveal-coach-search"
          info={
            preAssignedCoachId
              ? 'This slot has a pre-assigned coach. You can change it before sending.'
              : 'Select the coach who will host this session.'
          }
        >
          <SearchableCoachAvailabilityList
            id="reveal-coach-search"
            coaches={coachList}
            selectedCoachId={selectedCoachId}
            onSelectCoach={setSelectedCoachId}
            preAssignedCoachId={preAssignedCoachId}
            isLoading={isLoadingAvailability}
          />
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

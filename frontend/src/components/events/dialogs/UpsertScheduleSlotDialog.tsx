import { useState, useEffect, useMemo } from 'react'
import { format, addSeconds } from 'date-fns'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import MenuItem from '@mui/material/MenuItem'
import { Select } from '@/components/shared/form/Select'
import Avatar from '@mui/material/Avatar'
import { isWeekdayAllowed, formatAllowedWeekdays } from '../form/eventCapabilityRules'
import type { Event, EventScheduleSlot, TeamMember, InteractionType } from '@/types'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'

interface UpsertScheduleSlotDialogProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  slot?: EventScheduleSlot | null // If provided, we are editing
  onSave: (data: { startTime: string; endTime: string; capacity: number | null; assignedCoachId: string | null }) => void
  isPending: boolean
  teamMembers: TeamMember[]
}

export function UpsertScheduleSlotDialog({
  isOpen,
  onClose,
  event,
  slot,
  onSave,
  isPending,
  teamMembers,
}: UpsertScheduleSlotDialogProps) {
  const allowedDays = useMemo(() => event.allowedWeekdays ?? [], [event.allowedWeekdays])
  const mode = slot ? 'Edit' : 'Add'
  const caps = INTERACTION_TYPE_CAPS[event.interactionType as InteractionType]
  const supportsMultipleParticipants = caps.multipleParticipants

  // Local state for the form
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotCapacity, setNewSlotCapacity] = useState<number | ''>('')
  const [assignedCoachId, setAssignedCoachId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sync state when slot changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (slot) {
        setNewSlotDate(format(new Date(slot.startTime), "yyyy-MM-dd'T'HH:mm"))
        setNewSlotCapacity(slot.capacity ?? '')
        setAssignedCoachId(slot.assignedCoachId ?? null)
        setError(null)
      } else {
        const initialDate = format(new Date(), "yyyy-MM-dd'T'HH:mm")
        setNewSlotDate(initialDate)
        setNewSlotCapacity('')
        setAssignedCoachId(null)
        if (!isWeekdayAllowed(initialDate, allowedDays)) {
          setError(
            `Selected date must be one of the allowed weekdays: ${formatAllowedWeekdays(allowedDays)}`
          )
        } else {
          setError(null)
        }
      }
    }
  }, [isOpen, slot, allowedDays])

  function handleDateChange(value: string) {
    setNewSlotDate(value)
    if (value && !isWeekdayAllowed(value, allowedDays)) {
      setError(
        `Selected date must be one of the allowed weekdays: ${formatAllowedWeekdays(allowedDays)}`
      )
    } else {
      setError(null)
    }
  }

  function handleAdd() {
    if (!newSlotDate || !isWeekdayAllowed(newSlotDate, allowedDays)) {
      return
    }

    const startTime = new Date(newSlotDate)
    const endTime = addSeconds(startTime, event.durationSeconds)

    onSave({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      capacity: !supportsMultipleParticipants ? 1 : (newSlotCapacity === '' ? null : newSlotCapacity),
      assignedCoachId,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mode} Scheduled Session`}>
      <Stack spacing={3} sx={{ mt: 1 }}>
        <FormField
          label="Start Date & Time"
          htmlFor="slot-start"
          required
          error={error || undefined}
        >
          <Input
            id="slot-start"
            type="datetime-local"
            value={newSlotDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </FormField>

        {supportsMultipleParticipants && (
          <FormField
            label="Capacity Override (Optional)"
            htmlFor="slot-capacity"
            info="Leave empty to use the default event capacity."
          >
            <Input
              id="slot-capacity"
              type="number"
              min="1"
              value={newSlotCapacity}
              onChange={(e) => setNewSlotCapacity(e.target.value ? Number(e.target.value) : '')}
              placeholder="e.g. 20"
            />
          </FormField>
        )}

        {error && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Note: The session will last {event.durationSeconds / 60} minutes based on the event
            configuration.
          </Typography>
        </Box>

        <FormField
          label="Override Host (Optional)"
          htmlFor="slot-coach"
          info="If specified, this coach will host this specific session. Leave as 'Default' to use the event lead."
        >
          <Select
            id="slot-coach"
            value={assignedCoachId ?? ''}
            onChange={(e) => setAssignedCoachId((e.target.value as string) || null)}
            displayEmpty
          >
            <MenuItem value="">
              <em>Team Default (Round Robin / Direct)</em>
            </MenuItem>
            {teamMembers.map((member) => (
              <MenuItem key={member.user.id} value={member.user.id}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar
                    src={member.user.avatarUrl ?? undefined}
                    sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                  >
                    {member.user.firstName[0]}
                    {member.user.lastName[0]}
                  </Avatar>
                  <Typography variant="body2">
                    {member.user.firstName} {member.user.lastName}
                  </Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormField>

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} isLoading={isPending} disabled={!!error || !newSlotDate}>
            {mode === 'Edit' ? 'Update Session' : 'Add Session'}
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { FormField } from '@/components/shared/form/FormField'
import { Input } from '@/components/shared/form/Input'
import { Clock } from 'lucide-react'
import type { Event, EventScheduleSlot, InteractionType } from '@/types'
import { INTERACTION_TYPE_CAPS } from '@/constants/interactionTypes'
import { useScheduleSlotForm } from './useScheduleSlotForm'
import { RecurrenceSelector, type RecurrenceConfig } from './RecurrenceSelector'
import { zonedStringToUTC } from '@/utils/dateTimezone'
import { SearchableCoachAvailabilityList } from '@/components/events/SearchableCoachAvailabilityList'
import { useCoachAvailabilityForProposedSlot } from '@/hooks/queries/useEvents'

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { format } from 'date-fns'

interface UpsertScheduleSlotDialogProps {
  isOpen: boolean
  onClose: () => void
  event: Event
  slot?: EventScheduleSlot | null
  onSave: (data: {
    startTime: string
    endTime: string
    capacity: number | null
    assignedCoachId: string | null
    recurrence?: RecurrenceConfig | null
  }) => void
  isPending: boolean
}

export function UpsertScheduleSlotDialog({
  isOpen,
  onClose,
  event,
  slot,
  onSave,
  isPending,
}: UpsertScheduleSlotDialogProps) {
  const mode = slot ? 'Edit' : 'Add'
  const caps = INTERACTION_TYPE_CAPS[event.interactionType as InteractionType]
  const supportsMultipleParticipants = caps.multipleParticipants

  const {
    newSlotDate,
    newSlotCapacity,
    assignedCoachId,
    recurrence,
    error,
    setNewSlotCapacity,
    setAssignedCoachId,
    setRecurrence,
    handleDateChange,
    isValid,
  } = useScheduleSlotForm({ slot, isOpen })

  const proposedStart = newSlotDate
    ? zonedStringToUTC(newSlotDate, browserTimezone).toISOString()
    : null
  const proposedEnd =
    newSlotDate && proposedStart
      ? new Date(new Date(proposedStart).getTime() + event.durationSeconds * 1000).toISOString()
      : null
  const previewEndTime = proposedEnd ? new Date(proposedEnd) : null

  const { data: coachAvailability, isLoading: isLoadingAvailability } =
    useCoachAvailabilityForProposedSlot(
      event.id,
      proposedStart,
      proposedEnd,
      slot?.id ?? null,
      isOpen && !!newSlotDate,
    )

  const coachList =
    coachAvailability ??
    event.coaches.map((ec) => ({
      coachUserId: ec.coachUserId,
      coachUser: ec.coachUser,
      isAvailable: true,
      conflicts: [] as any[],
    }))

  function handleAdd() {
    if (!isValid || !proposedStart || !proposedEnd) return

    onSave({
      startTime: proposedStart,
      endTime: proposedEnd,
      capacity: !supportsMultipleParticipants ? 1 : newSlotCapacity === '' ? null : newSlotCapacity,
      assignedCoachId,
      recurrence,
    })
  }

  const noCoachesConfigured = event.coaches.length === 0 && !event.fixedLeadCoachId

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mode} Scheduled Session`}>
      <Stack spacing={2.5} sx={{ mt: 1 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ flex: supportsMultipleParticipants ? 2 : 1 }}>
            <FormField
              label="Start Date & Time"
              htmlFor="slot-start"
              required
              error={error || undefined}
            >
              <DateTimePicker
                value={newSlotDate ? new Date(newSlotDate) : null}
                onChange={(newValue) => {
                  if (newValue && !isNaN(newValue.getTime())) {
                    handleDateChange(format(newValue, "yyyy-MM-dd'T'HH:mm"))
                  } else {
                    handleDateChange('')
                  }
                }}
                disabled={isPending}
                slotProps={{
                  textField: {
                    size: 'small',
                    fullWidth: true,
                    error: !!error,
                    id: 'slot-start',
                    InputProps: {
                      sx: {
                        borderRadius: 1.5,
                        '& fieldset': {
                          borderColor: 'divider',
                        },
                      },
                    },
                  },
                }}
              />
            </FormField>
          </Box>

          {supportsMultipleParticipants && (
            <Box sx={{ flex: 1 }}>
              <FormField
                label="Capacity Override"
                htmlFor="slot-capacity"
                info={
                  event.maxParticipantCount
                    ? `Leave empty to use event default (${event.maxParticipantCount}).`
                    : 'Leave empty for no limit.'
                }
              >
                <Input
                  id="slot-capacity"
                  type="number"
                  min="1"
                  value={newSlotCapacity}
                  onChange={(e) => setNewSlotCapacity(e.target.value ? Number(e.target.value) : '')}
                  placeholder="e.g. 20"
                  sx={{ borderRadius: 1.5 }}
                />
              </FormField>
            </Box>
          )}
        </Stack>

        {error && (
          <Alert severity="warning" sx={{ mb: 1, borderRadius: 1.5 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            p: 2,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>
            <Clock size={20} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              Note: The session will last {event.durationSeconds / 60} minutes based on the event configuration.
            </Typography>
            <Typography variant="body2" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Session ends at:{' '}
              <strong>
                {newSlotDate && previewEndTime ? (
                  new Intl.DateTimeFormat('en-US', {
                    timeZone: browserTimezone,
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true,
                  }).format(previewEndTime)
                ) : (
                  '—'
                )}
              </strong>
            </Typography>
          </Box>
        </Box>

        <FormField
          label="Override Host (Optional)"
          htmlFor="slot-coach"
          info={
            event.assignmentStrategy === 'ROUND_ROBIN'
              ? 'If specified, this coach overrides the automatic round-robin assignment for this slot. Leave blank to let the system pick the next coach in rotation.'
              : 'If specified, this coach will host this specific session. Leave blank to use the event lead. Availability is checked against the selected session time.'
          }
        >
          <SearchableCoachAvailabilityList
            id="slot-coach"
            coaches={coachList}
            selectedCoachId={assignedCoachId ?? ''}
            onSelectCoach={(id) => setAssignedCoachId(id || null)}
            preAssignedCoachId={slot?.assignedCoachId ?? null}
            isLoading={isLoadingAvailability && !!newSlotDate}
          />
          {noCoachesConfigured && !assignedCoachId && (
            <Alert severity="warning" sx={{ mt: 1, borderRadius: 1.5 }}>
              No coaches are assigned to this event. Students will not be able to book this slot
              until at least one coach is added to the event.
            </Alert>
          )}
        </FormField>

        {mode === 'Add' && (
          <RecurrenceSelector
            value={recurrence}
            onChange={setRecurrence}
            disabled={isPending}
            startDate={newSlotDate}
          />
        )}

        <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
          <Button variant="secondary" onClick={onClose} sx={{ borderRadius: 1.5 }}>
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            isLoading={isPending}
            disabled={!!error || !newSlotDate}
            sx={{ borderRadius: 1.5 }}
          >
            {mode === 'Edit' ? 'Update Session' : 'Add Session'}
          </Button>
        </Stack>
      </Stack>
    </Modal>
  )
}

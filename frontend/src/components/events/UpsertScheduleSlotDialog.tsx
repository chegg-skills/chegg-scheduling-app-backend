import { useState, useEffect, useMemo } from 'react'
import { format, addSeconds } from 'date-fns'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import { isWeekdayAllowed, formatAllowedWeekdays } from './eventCapabilityRules'
import type { Event, EventScheduleSlot } from '@/types'

interface UpsertScheduleSlotDialogProps {
    isOpen: boolean
    onClose: () => void
    event: Event
    slot?: EventScheduleSlot | null // If provided, we are editing
    onSave: (data: { startTime: string; endTime: string; capacity: number | null }) => void
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
    const allowedDays = useMemo(() => event.allowedWeekdays ?? [], [event.allowedWeekdays])
    const mode = slot ? 'Edit' : 'Add'

    // Local state for the form
    const [newSlotDate, setNewSlotDate] = useState('')
    const [newSlotCapacity, setNewSlotCapacity] = useState<number | ''>('')
    const [error, setError] = useState<string | null>(null)

    // Sync state when slot changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (slot) {
                setNewSlotDate(format(new Date(slot.startTime), "yyyy-MM-dd'T'HH:mm"))
                setNewSlotCapacity(slot.capacity ?? '')
                setError(null)
            } else {
                const initialDate = format(new Date(), "yyyy-MM-dd'T'HH:mm")
                setNewSlotDate(initialDate)
                setNewSlotCapacity('')
                if (!isWeekdayAllowed(initialDate, allowedDays)) {
                    setError(`Selected date must be one of the allowed weekdays: ${formatAllowedWeekdays(allowedDays)}`)
                } else {
                    setError(null)
                }
            }
        }
    }, [isOpen, slot, allowedDays])

    function handleDateChange(value: string) {
        setNewSlotDate(value)
        if (value && !isWeekdayAllowed(value, allowedDays)) {
            setError(`Selected date must be one of the allowed weekdays: ${formatAllowedWeekdays(allowedDays)}`)
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
            capacity: newSlotCapacity === '' ? null : newSlotCapacity,
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

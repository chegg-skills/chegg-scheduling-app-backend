import { useState } from 'react'
import { format, addSeconds } from 'date-fns'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { FormField } from '@/components/shared/FormField'
import { Input } from '@/components/shared/Input'
import type { Event } from '@/types'

interface AddScheduleSlotDialogProps {
    isOpen: boolean
    onClose: () => void
    event: Event
    onCreate: (data: { startTime: string; endTime: string; capacity: number | null }) => void
    isPending: boolean
}

export function AddScheduleSlotDialog({
    isOpen,
    onClose,
    event,
    onCreate,
    isPending,
}: AddScheduleSlotDialogProps) {
    const [newSlotDate, setNewSlotDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"))
    const [newSlotCapacity, setNewSlotCapacity] = useState<number | ''>('')

    function handleAdd() {
        if (!newSlotDate) return

        const startTime = new Date(newSlotDate)
        const endTime = addSeconds(startTime, event.durationSeconds)

        onCreate({
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            capacity: newSlotCapacity === '' ? null : newSlotCapacity,
        })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Scheduled Session">
            <Stack spacing={3} sx={{ mt: 1 }}>
                <FormField label="Start Date & Time" htmlFor="slot-start" required>
                    <Input
                        id="slot-start"
                        type="datetime-local"
                        value={newSlotDate}
                        onChange={(e) => setNewSlotDate(e.target.value)}
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

                <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Note: The session will last {event.durationSeconds / 60} minutes based on the event
                        configuration.
                    </Typography>
                </Box>

                <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
                    <Button variant="secondary" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleAdd} isLoading={isPending}>
                        Add Session
                    </Button>
                </Stack>
            </Stack>
        </Modal>
    )
}

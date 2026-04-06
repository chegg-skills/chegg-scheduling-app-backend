import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Plus } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Spinner } from '@/components/shared/Spinner'
import {
    useEventScheduleSlots,
    useCreateEventScheduleSlot,
    useDeleteEventScheduleSlot,
} from '@/hooks/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import type { Event } from '@/types'
import { AddScheduleSlotDialog } from './AddScheduleSlotDialog'
import { ScheduleSlotList } from './ScheduleSlotList'

interface Props {
    event: Event
}

export function EventScheduleSlotManager({ event }: Props) {
    const { data, isLoading } = useEventScheduleSlots(event.id)
    const { mutate: create, isPending: creating } = useCreateEventScheduleSlot(event.id)
    const { mutate: remove } = useDeleteEventScheduleSlot(event.id)
    const { handleAction } = useAsyncAction()

    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const slots = data?.slots || []

    function handleCreate(slotData: { startTime: string; endTime: string; capacity: number | null }) {
        create(slotData, {
            onSuccess: () => {
                setIsAddModalOpen(false)
            },
        })
    }

    function handleRemove(slotId: string, info: string) {
        handleAction(remove, slotId, {
            title: 'Delete Session',
            message: `Are you sure you want to delete the session on ${info}?\n\nThis action cannot be undone.`,
            actionName: 'Delete',
        })
    }

    if (isLoading) return <Spinner />

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Scheduled Sessions ({slots.length})
                </Typography>
                <Button size="sm" startIcon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
                    Add Session
                </Button>
            </Stack>

            <ScheduleSlotList slots={slots} onRemove={handleRemove} />

            <AddScheduleSlotDialog
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                event={event}
                onCreate={handleCreate}
                isPending={creating}
            />
        </Box>
    )
}

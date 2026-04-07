import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Plus } from 'lucide-react'
import { Button } from '@/components/shared/Button'
import { Spinner } from '@/components/shared/Spinner'
import {
    useCreateEventScheduleSlot,
    useUpdateEventScheduleSlot,
    useDeleteEventScheduleSlot,
} from '@/hooks/useEvents'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import type { Event, EventScheduleSlot } from '@/types'
import { UpsertScheduleSlotDialog } from './UpsertScheduleSlotDialog'
import { ScheduleSlotList } from './ScheduleSlotList'

interface Props {
    event: Event
    slots: EventScheduleSlot[]
    isLoading: boolean
}

export function EventScheduleSlotManager({ event, slots, isLoading }: Props) {
    const { mutate: create, isPending: creating } = useCreateEventScheduleSlot(event.id)
    const { mutate: update, isPending: updating } = useUpdateEventScheduleSlot(event.id)
    const { mutate: remove } = useDeleteEventScheduleSlot(event.id)
    const { handleAction } = useAsyncAction()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingSlot, setEditingSlot] = useState<EventScheduleSlot | null>(null)

    function handleOpenAdd() {
        setEditingSlot(null)
        setIsModalOpen(true)
    }

    function handleOpenEdit(slot: EventScheduleSlot) {
        setEditingSlot(slot)
        setIsModalOpen(true)
    }

    function handleSave(slotData: { startTime: string; endTime: string; capacity: number | null }) {
        if (editingSlot) {
            update(
                { slotId: editingSlot.id, data: slotData },
                {
                    onSuccess: () => {
                        setIsModalOpen(false)
                        setEditingSlot(null)
                    },
                }
            )
        } else {
            create(slotData, {
                onSuccess: () => {
                    setIsModalOpen(false)
                },
            })
        }
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
                <Button size="sm" startIcon={<Plus size={16} />} onClick={handleOpenAdd}>
                    Add Session
                </Button>
            </Stack>

            <ScheduleSlotList
                slots={slots}
                event={event}
                onRemove={handleRemove}
                onEdit={handleOpenEdit}
            />

            <UpsertScheduleSlotDialog
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingSlot(null)
                }}
                event={event}
                slot={editingSlot}
                onSave={handleSave}
                isPending={creating || updating}
            />
        </Box>
    )
}

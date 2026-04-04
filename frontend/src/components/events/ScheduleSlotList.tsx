import { format } from 'date-fns'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Tooltip from '@mui/material/Tooltip'
import { Trash2, Calendar as CalendarIcon, Clock, Users } from 'lucide-react'
import type { EventScheduleSlot } from '@/types'

interface ScheduleSlotListProps {
    slots: EventScheduleSlot[]
    onRemove: (slotId: string, info: string) => void
}

export function ScheduleSlotList({ slots, onRemove }: ScheduleSlotListProps) {
    if (slots.length === 0) {
        return (
            <Paper
                variant="outlined"
                sx={{
                    p: 4,
                    textAlign: 'center',
                    borderStyle: 'dashed',
                    bgcolor: 'background.default',
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    No sessions scheduled yet for this event.
                </Typography>
            </Paper>
        )
    }

    return (
        <Stack spacing={1.5}>
            {slots.map((slot) => {
                const dateStr = format(new Date(slot.startTime), 'EEE, MMM d, yyyy')
                const timeRange = `${format(new Date(slot.startTime), 'h:mm a')} – ${format(
                    new Date(slot.endTime),
                    'h:mm a'
                )}`

                return (
                    <Paper
                        key={slot.id}
                        variant="outlined"
                        sx={{
                            p: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.2s',
                            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
                        }}
                    >
                        <Stack direction="row" spacing={3} alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                                <CalendarIcon size={16} className="text-muted-foreground" />
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                    {dateStr}
                                </Typography>
                            </Stack>

                            <Stack direction="row" spacing={1} alignItems="center">
                                <Clock size={16} className="text-muted-foreground" />
                                <Typography variant="body2">{timeRange}</Typography>
                            </Stack>

                            {slot.capacity && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Users size={16} className="text-muted-foreground" />
                                    <Typography variant="body2" color="text.secondary">
                                        Limit: {slot.capacity}
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>

                        <Tooltip title="Delete Session">
                            <IconButton
                                size="small"
                                color="error"
                                onClick={() => onRemove(slot.id, `${dateStr} at ${timeRange}`)}
                            >
                                <Trash2 size={18} />
                            </IconButton>
                        </Tooltip>
                    </Paper>
                )
            })}
        </Stack>
    )
}

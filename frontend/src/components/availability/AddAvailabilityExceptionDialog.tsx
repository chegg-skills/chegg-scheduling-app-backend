import { useState } from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import type { CreateAvailabilityExceptionDto } from '@/types'

interface AddAvailabilityExceptionDialogProps {
    open: boolean
    onClose: () => void
    onAdd: (data: CreateAvailabilityExceptionDto) => Promise<void>
}

// Current date in yyyy-mm-dd for input
const getTodayStr = () => new Date().toISOString().split('T')[0]

export function AddAvailabilityExceptionDialog({
    open,
    onClose,
    onAdd,
}: AddAvailabilityExceptionDialogProps) {
    const [newException, setNewException] = useState<CreateAvailabilityExceptionDto>({
        date: getTodayStr(),
        isUnavailable: true,
        startTime: '09:00',
        endTime: '17:00',
    })

    const handleAdd = async () => {
        await onAdd(newException)
        onClose()
        setNewException({
            date: getTodayStr(),
            isUnavailable: true,
            startTime: '09:00',
            endTime: '17:00',
        })
    }

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle>Add Availability Exception</DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <TextField
                        label="Date"
                        type="date"
                        fullWidth
                        value={newException.date}
                        onChange={(e) => setNewException({ ...newException, date: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />

                    <TextField
                        select
                        label="Availability Type"
                        fullWidth
                        value={String(newException.isUnavailable)}
                        onChange={(e) => setNewException({ ...newException, isUnavailable: e.target.value === 'true' })}
                    >
                        <MenuItem value="true">Unavailable (All Day)</MenuItem>
                        <MenuItem value="false">Custom Hours</MenuItem>
                    </TextField>

                    {!newException.isUnavailable && (
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Start Time"
                                type="time"
                                fullWidth
                                value={newException.startTime}
                                onChange={(e) => setNewException({ ...newException, startTime: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                label="End Time"
                                type="time"
                                fullWidth
                                value={newException.endTime}
                                onChange={(e) => setNewException({ ...newException, endTime: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant="contained" onClick={handleAdd}>
                    Add Exception
                </Button>
            </DialogActions>
        </Dialog>
    )
}

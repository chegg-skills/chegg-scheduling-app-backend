import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import { Plus, Trash2 } from 'lucide-react'
import type { UserAvailabilityException, CreateAvailabilityExceptionDto } from '@/types'

interface AvailabilityExceptionsManagerProps {
    exceptions: UserAvailabilityException[]
    onAdd: (data: CreateAvailabilityExceptionDto) => Promise<void>
    onRemove: (id: string) => Promise<void>
    disabled?: boolean
}

// Simple date formatter to avoid date-fns dependency if not present
const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Current date in yyyy-mm-dd for input
const getTodayStr = () => new Date().toISOString().split('T')[0]

export function AvailabilityExceptionsManager({
    exceptions,
    onAdd,
    onRemove,
    disabled
}: AvailabilityExceptionsManagerProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [newException, setNewException] = useState<CreateAvailabilityExceptionDto>({
        date: getTodayStr(),
        isUnavailable: true,
        startTime: '09:00',
        endTime: '17:00'
    })

    const futureExceptions = [...exceptions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const handleAdd = async () => {
        await onAdd(newException)
        setIsDialogOpen(false)
        setNewException({
            date: getTodayStr(),
            isUnavailable: true,
            startTime: '09:00',
            endTime: '17:00'
        })
    }

    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Exceptions & Time Off</Typography>
                <Button
                    variant="outlined"
                    startIcon={<Plus size={18} />}
                    onClick={() => setIsDialogOpen(true)}
                    disabled={disabled}
                    size="small"
                >
                    Add Exception
                </Button>
            </Stack>

            {futureExceptions.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', bgcolor: 'transparent', borderStyle: 'dashed' }}>
                    <Typography color="text.secondary">No availability exceptions scheduled.</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'transparent' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Hours</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {futureExceptions.map((ex) => (
                                <TableRow key={ex.id}>
                                    <TableCell>{formatDate(ex.date)}</TableCell>
                                    <TableCell>
                                        {ex.isUnavailable ? (
                                            <Typography variant="caption" sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'error.main', color: 'white' }}>
                                                Unavailable
                                            </Typography>
                                        ) : (
                                            <Typography variant="caption" sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: 'success.main', color: 'white' }}>
                                                Custom Hours
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {ex.isUnavailable ? '-' : `${ex.startTime} - ${ex.endTime}`}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton size="small" color="error" onClick={() => onRemove(ex.id)} disabled={disabled}>
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} fullWidth maxWidth="xs">
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
                    <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAdd}>Add Exception</Button>
                </DialogActions>
            </Dialog>
        </Box>
    )
}

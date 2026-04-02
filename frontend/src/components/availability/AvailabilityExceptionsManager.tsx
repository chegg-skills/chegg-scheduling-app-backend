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
            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1.5}
                sx={{ mb: 2.5 }}
            >
                <Typography variant="h6" sx={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Exceptions & Time Off
                </Typography>
                <Button
                    variant="outlined"
                    startIcon={<Plus size={16} />}
                    onClick={() => setIsDialogOpen(true)}
                    disabled={disabled}
                    size="small"
                    sx={{ borderRadius: 1.5 }}
                >
                    Add Exception
                </Button>
            </Stack>

            {futureExceptions.length === 0 ? (
                <Paper
                    variant="outlined"
                    sx={{
                        p: 4,
                        textAlign: 'center',
                        bgcolor: 'rgba(0,0,0,0.02)',
                        borderStyle: 'dashed',
                        borderRadius: 2
                    }}
                >
                    <Typography variant="body2" color="text.secondary">No availability exceptions scheduled.</Typography>
                </Paper>
            ) : (
                <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{
                        bgcolor: 'transparent',
                        borderRadius: 1.5,
                        overflowX: 'auto',
                        '& .MuiTableCell-root': {
                            py: 1.5,
                            px: 1.5,
                        }
                    }}
                >
                    <Table size="small" sx={{ minWidth: 400, tableLayout: 'fixed' }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                                <TableCell sx={{ width: '32%', fontWeight: 600 }}>Date</TableCell>
                                <TableCell sx={{ width: '30%', fontWeight: 600 }}>Type</TableCell>
                                <TableCell sx={{ width: '28%', fontWeight: 600 }}>Hours</TableCell>
                                <TableCell align="right" sx={{ width: '10%' }}></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {futureExceptions.map((ex) => (
                                <TableRow key={ex.id} hover>
                                    <TableCell sx={{ fontSize: '0.8125rem' }}>
                                        {formatDate(ex.date)}
                                    </TableCell>
                                    <TableCell>
                                        <Box
                                            sx={{
                                                display: 'inline-flex',
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1,
                                                fontSize: '0.75rem',
                                                fontWeight: 600,
                                                bgcolor: ex.isUnavailable ? 'error.light' : 'success.light',
                                                color: ex.isUnavailable ? 'error.dark' : 'success.dark',
                                            }}
                                        >
                                            {ex.isUnavailable ? 'Unavailable' : 'Custom'}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                                        {ex.isUnavailable ? '—' : `${ex.startTime} - ${ex.endTime}`}
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            onClick={() => onRemove(ex.id)}
                                            disabled={disabled}
                                            sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                                        >
                                            <Trash2 size={14} />
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

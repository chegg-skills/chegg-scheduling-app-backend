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
import { Plus, Trash2 } from 'lucide-react'
import type { UserAvailabilityException, CreateAvailabilityExceptionDto } from '@/types'
import { AddAvailabilityExceptionDialog } from './AddAvailabilityExceptionDialog'

interface AvailabilityExceptionsManagerProps {
    exceptions: UserAvailabilityException[]
    onAdd: (data: CreateAvailabilityExceptionDto) => Promise<void>
    onRemove: (id: string) => Promise<void>
    disabled?: boolean
}

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

export function AvailabilityExceptionsManager({
    exceptions,
    onAdd,
    onRemove,
    disabled,
}: AvailabilityExceptionsManagerProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const futureExceptions = [...exceptions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

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
                <Paper
                    variant="outlined"
                    sx={{ p: 4, textAlign: 'center', bgcolor: 'transparent', borderStyle: 'dashed' }}
                >
                    <Typography color="text.secondary">No availability exceptions scheduled.</Typography>
                </Paper>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'transparent' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
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
                                    <TableCell>{ex.isUnavailable ? '-' : `${ex.startTime} - ${ex.endTime}`}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => onRemove(ex.id)}
                                            disabled={disabled}
                                        >
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <AddAvailabilityExceptionDialog
                open={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onAdd={onAdd}
            />
        </Box>
    )
}

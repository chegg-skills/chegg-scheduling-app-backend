import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { CalendarRange, X } from 'lucide-react'
import { useState } from 'react'
import type { StatsTimeframe } from '@/types'

export const DEFAULT_TIMEFRAMES: Array<{ value: StatsTimeframe; label: string }> = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'thisWeek', label: 'This week' },
    { value: 'lastWeek', label: 'Last week' },
    { value: 'thisMonth', label: 'This month' },
    { value: 'lastMonth', label: 'Last month' },
    { value: 'thisQuarter', label: 'This quarter' },
    { value: 'lastQuarter', label: 'Last quarter' },
    { value: 'thisYear', label: 'This year' },
    { value: 'lastYear', label: 'Last year' },
    { value: 'all', label: 'All time' },
]

export interface DateFilterModalProps {
    open: boolean
    onClose: () => void
    currentValue: StatsTimeframe
    onChange: (value: StatsTimeframe) => void
}

export function DateFilterModal({ open, onClose, currentValue, onChange }: DateFilterModalProps) {
    const [selected, setSelected] = useState<StatsTimeframe>(currentValue)
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')

    const handleApply = () => {
        if (selected === 'custom') {
            if (customStart && customEnd) {
                onChange(`custom:${customStart}:${customEnd}`)
            }
        } else {
            onChange(selected)
        }
        onClose()
    }

    // Pre-fill custom if passed from currentValue
    const isCustom = selected.startsWith('custom') || selected === 'custom'

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarRange size={20} />
                    <Typography variant="h6">Select Date Range</Typography>
                </Stack>
                <Button onClick={onClose} sx={{ minWidth: 0, p: 1, color: 'text.secondary' }}>
                    <X size={20} />
                </Button>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 1 }}>
                    {DEFAULT_TIMEFRAMES.map((tf) => (
                        <Button
                            key={tf.value}
                            variant={selected === tf.value ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => setSelected(tf.value)}
                            sx={{ justifyContent: 'flex-start', px: 1.5, py: 0.75 }}
                        >
                            {tf.label}
                        </Button>
                    ))}
                    <Button
                        variant={isCustom ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => setSelected('custom')}
                        sx={{ justifyContent: 'flex-start', px: 1.5, py: 0.75 }}
                    >
                        Custom Range
                    </Button>
                </Box>

                {isCustom && (
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <TextField
                            label="Start Date"
                            type="date"
                            fullWidth
                            size="small"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                            label="End Date"
                            type="date"
                            fullWidth
                            size="small"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Stack>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} color="inherit">Cancel</Button>
                <Button onClick={handleApply} variant="contained" disabled={isCustom && (!customStart || !customEnd)}>Apply</Button>
            </DialogActions>
        </Dialog>
    )
}

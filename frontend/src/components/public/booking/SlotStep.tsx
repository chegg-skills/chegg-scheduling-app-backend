import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { PageSpinner } from '@/components/shared/Spinner'

interface SlotStepProps {
    slots: string[]
    loading: boolean
    selectedDate: Date
    onDateSelect: (date: Date) => void
    selectedSlot: string | null
    onSelect: (slot: string) => void
    onNext: () => void
}

export function SlotStep({
    slots,
    loading,
    selectedDate,
    onDateSelect,
    selectedSlot,
    onSelect,
    onNext
}: SlotStepProps) {
    const { amSlots, pmSlots } = useMemo(() => {
        const am: string[] = []
        const pm: string[] = []

        // Ensure slots are sorted chronologically
        const sorted = [...slots].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

        sorted.forEach(s => {
            const date = new Date(s)
            if (date.getHours() < 12) {
                am.push(s)
            } else {
                pm.push(s)
            }
        })

        return { amSlots: am, pmSlots: pm }
    }, [slots])

    const renderSlotGrid = (items: string[]) => (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
                gap: 1.5,
                mb: 4
            }}
        >
            {items.map(s => (
                <Button
                    key={s}
                    variant={selectedSlot === s ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => onSelect(s)}
                    sx={{
                        py: 1.5,
                        borderRadius: 2,
                        fontWeight: 600,
                        fontSize: '0.875rem'
                    }}
                >
                    {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(s))}
                </Button>
            ))}
        </Box>
    )

    return (
        <Box>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="flex-start">
                <Box sx={{ width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>
                    <Paper variant="outlined" sx={{ overflow: 'hidden', borderRadius: 2 }}>
                        <StaticDatePicker
                            displayStaticWrapperAs="desktop"
                            value={selectedDate}
                            onChange={(newValue) => newValue && onDateSelect(newValue)}
                            minDate={new Date()}
                            slotProps={{
                                actionBar: { actions: [] },
                            }}
                        />
                    </Paper>
                </Box>

                <Box sx={{ flexGrow: 1, width: '100%' }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                        Available Slots
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {new Intl.DateTimeFormat('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        }).format(selectedDate)}
                    </Typography>

                    <Divider sx={{ mb: 3 }} />

                    {loading ? (
                        <PageSpinner />
                    ) : slots.length === 0 ? (
                        <Box sx={{ py: 8, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                No available slots for this date.
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Please try selecting another day.
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            {amSlots.length > 0 && (
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Morning (AM)
                                    </Typography>
                                    {renderSlotGrid(amSlots)}
                                </Box>
                            )}

                            {pmSlots.length > 0 && (
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Afternoon & Evening (PM)
                                    </Typography>
                                    {renderSlotGrid(pmSlots)}
                                </Box>
                            )}
                        </Box>
                    )}

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            disabled={!selectedSlot}
                            onClick={onNext}
                            size="large"
                            sx={{ px: 4 }}
                        >
                            Confirm Selection
                        </Button>
                    </Box>
                </Box>
            </Stack>
        </Box>
    )
}

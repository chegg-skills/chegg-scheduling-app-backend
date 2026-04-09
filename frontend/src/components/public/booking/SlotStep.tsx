import { useMemo } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Divider from '@mui/material/Divider'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import { PageSpinner } from '@/components/shared/Spinner'
import type { AvailableSlot } from '@/api/public'

interface SlotStepProps {
    slots: AvailableSlot[]
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
        const am: AvailableSlot[] = []
        const pm: AvailableSlot[] = []

        // Ensure slots are sorted chronologically
        const sorted = [...slots].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

        sorted.forEach(s => {
            const date = new Date(s.startTime)
            if (date.getHours() < 12) {
                am.push(s)
            } else {
                pm.push(s)
            }
        })

        return { amSlots: am, pmSlots: pm }
    }, [slots])

    const renderSlotGrid = (items: AvailableSlot[]) => (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: 'repeat(3, 1fr)',
                    sm: 'repeat(4, 1fr)',
                    md: 'repeat(5, 1fr)',
                    lg: 'repeat(6, 1fr)'
                },
                gap: 1,
                mb: 4
            }}
        >
            {items.map(s => (
                <Button
                    key={s.startTime}
                    variant={selectedSlot === s.startTime ? 'contained' : 'outlined'}
                    fullWidth
                    onClick={() => onSelect(s.startTime)}
                    sx={{
                        py: 1.5,
                        px: 0.5,
                        minWidth: 'auto',
                        borderRadius: 1,
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textTransform: 'none',
                    }}
                >
                    <Typography variant="caption" fontWeight={700}>
                        {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(s.startTime))}
                    </Typography>
                    {s.remainingSeats !== null && s.remainingSeats !== undefined && s.maxSeats && s.maxSeats > 1 && (
                        <Typography variant="caption" sx={{ mt: 0, fontSize: '0.65rem', opacity: 0.8 }}>
                            {s.remainingSeats} left
                        </Typography>
                    )}
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

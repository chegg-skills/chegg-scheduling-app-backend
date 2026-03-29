import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { PageSpinner } from '@/components/shared/Spinner'

interface SlotStepProps {
    slots: string[]
    loading: boolean
    selectedSlot: string | null
    onSelect: (slot: string) => void
    onNext: () => void
}

export function SlotStep({
    slots,
    loading,
    selectedSlot,
    onSelect,
    onNext
}: SlotStepProps) {
    if (loading) return <PageSpinner />
    if (slots.length === 0) return (
        <Typography align="center" sx={{ py: 4 }}>
            No available slots for the next 7 days.
        </Typography>
    )

    // Group slots by day
    const groupedSlots: Record<string, string[]> = {}
    slots.forEach(s => {
        const d = new Date(s).toISOString().split('T')[0]
        if (!groupedSlots[d]) groupedSlots[d] = []
        groupedSlots[d].push(s)
    })

    return (
        <Box>
            {Object.entries(groupedSlots).map(([day, daySlots]) => (
                <Box key={day} sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                        {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date(day + 'T00:00:00'))}
                    </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' },
                            gap: 1
                        }}
                    >
                        {daySlots.map(s => (
                            <Button
                                key={s}
                                variant={selectedSlot === s ? 'contained' : 'outlined'}
                                fullWidth
                                size="small"
                                onClick={() => onSelect(s)}
                                sx={{ borderRadius: 1 }}
                            >
                                {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(s))}
                            </Button>
                        ))}
                    </Box>
                </Box>
            ))}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="contained" disabled={!selectedSlot} onClick={onNext}>
                    Next
                </Button>
            </Box>
        </Box>
    )
}

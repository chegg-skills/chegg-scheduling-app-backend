import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { AvailableSlot } from '@/api/public'
import { SlotButton } from './SlotButton'

interface SlotGroupProps {
    title: string
    slots: AvailableSlot[]
    selectedSlot: string | null
    onSelect: (slot: string) => void
    timeFormat: Intl.DateTimeFormat
}

export function SlotGroup({
    title,
    slots,
    selectedSlot,
    onSelect,
    timeFormat,
}: SlotGroupProps) {
    if (slots.length === 0) return null

    return (
        <Box sx={{ mb: 3 }}>
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 1.5, display: 'block', fontWeight: 700 }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                    gap: 0.5,
                }}
            >
                {slots.map((s) => (
                    <SlotButton
                        key={s.startTime}
                        slot={s}
                        isSelected={selectedSlot === s.startTime}
                        onClick={onSelect}
                        timeFormat={timeFormat}
                    />
                ))}
            </Box>
        </Box>
    )
}

import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { AvailableSlot } from '@/api/public'

interface SlotButtonProps {
    slot: AvailableSlot
    isSelected: boolean
    onClick: (startTime: string) => void
    timeFormat: Intl.DateTimeFormat
}

export function SlotButton({
    slot,
    isSelected,
    onClick,
    timeFormat,
}: SlotButtonProps) {
    const { startTime, maxSeats, remainingSeats } = slot

    return (
        <Button
            variant={isSelected ? 'contained' : 'outlined'}
            fullWidth
            onClick={() => onClick(startTime)}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                py: 1.5,
                px: 0,
                borderRadius: 1,
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'none',
                minHeight: 52,
                ...(isSelected
                    ? {
                        bgcolor: 'primary.main',
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' },
                    }
                    : {
                        borderColor: (theme) => alpha(theme.palette.divider, 0.5),
                        color: 'text.primary',
                        '&:hover': {
                            borderColor: 'primary.main',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                        },
                    }),
            }}
        >
            <Typography
                variant="caption"
                fontWeight={800}
                sx={{ color: 'inherit', lineHeight: 1.2 }}
            >
                {timeFormat.format(new Date(startTime))}
            </Typography>

            {maxSeats && maxSeats > 1 && (
                <Typography
                    variant="caption"
                    sx={{
                        fontSize: '0.65rem',
                        color: isSelected ? 'white' : 'text.secondary',
                        opacity: 0.8,
                        fontWeight: 600,
                    }}
                >
                    {remainingSeats ?? maxSeats} left
                </Typography>
            )}
        </Button>
    )
}

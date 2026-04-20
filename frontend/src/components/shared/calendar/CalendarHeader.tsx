import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { alpha, useTheme } from '@mui/material/styles'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

export interface CalendarLegend {
    label: string
    color: string
}

interface CalendarHeaderProps {
    currentMonth: Date
    onPrevMonth: () => void
    onNextMonth: () => void
    onToday: () => void
    legends?: CalendarLegend[]
}

export function CalendarHeader({
    currentMonth,
    onPrevMonth,
    onNextMonth,
    onToday,
    legends = [],
}: CalendarHeaderProps) {
    const theme = useTheme()

    return (
        <Box
            sx={{
                p: 2.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                bgcolor: alpha(theme.palette.primary.main, 0.02),
            }}
        >
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6" sx={{ fontWeight: 700, minWidth: 160 }}>
                    {format(currentMonth, 'MMMM yyyy')}
                </Typography>
                <Stack direction="row" spacing={1}>
                    <IconButton
                        onClick={onPrevMonth}
                        size="small"
                        sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                        <ChevronLeft size={18} />
                    </IconButton>
                    <IconButton
                        onClick={onNextMonth}
                        size="small"
                        sx={{ border: '1px solid', borderColor: 'divider' }}
                    >
                        <ChevronRight size={18} />
                    </IconButton>
                    <Button
                        variant="outlined"
                        onClick={onToday}
                        size="small"
                        sx={{
                            textTransform: 'none',
                            height: 32,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 2,
                            borderColor: 'divider',
                            color: 'text.primary',
                        }}
                    >
                        Today
                    </Button>
                </Stack>
            </Stack>

            <Stack direction="row" spacing={2.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
                {legends.map((legend) => (
                    <Stack key={legend.label} direction="row" spacing={1} alignItems="center">
                        <Box
                            sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: legend.color }}
                        />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                            {legend.label}
                        </Typography>
                    </Stack>
                ))}
            </Stack>
        </Box>
    )
}

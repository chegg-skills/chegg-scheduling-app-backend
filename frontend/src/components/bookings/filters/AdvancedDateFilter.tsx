import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker'
import {
    startOfToday,
    endOfToday,
    startOfYesterday,
    endOfYesterday,
    startOfTomorrow,
    endOfTomorrow,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths,
    endOfDay,
} from 'date-fns'

interface AdvancedDateFilterProps {
    startDate: Date | null
    endDate: Date | null
    onRangeChange: (start: Date | null, end: Date | null) => void
}

export const AdvancedDateFilter = ({
    startDate,
    endDate,
    onRangeChange,
}: AdvancedDateFilterProps) => {
    const presets = [
        { label: 'Today', getRange: () => [startOfToday(), endOfToday()] },
        { label: 'Yesterday', getRange: () => [startOfYesterday(), endOfYesterday()] },
        { label: 'Tomorrow', getRange: () => [startOfTomorrow(), endOfTomorrow()] },
        { label: 'Last 7 Days', getRange: () => [subDays(startOfToday(), 7), endOfToday()] },
        { label: 'This Month', getRange: () => [startOfMonth(new Date()), endOfMonth(new Date())] },
        {
            label: 'Last Month', getRange: () => {
                const lm = subMonths(new Date(), 1)
                return [startOfMonth(lm), endOfMonth(lm)]
            }
        },
    ]

    const handlePreset = (label: string) => {
        const preset = presets.find(p => p.label === label)
        if (preset) {
            const [start, end] = preset.getRange()
            onRangeChange(start, end)
        }
    }

    const handleManualEndChange = (val: Date | null) => {
        if (!val) {
            onRangeChange(startDate, null)
            return
        }
        // Set to 23:59:59 of the selected day
        onRangeChange(startDate, endOfDay(val))
    }

    return (
        <Stack direction="row" spacing={3} sx={{ alignItems: 'flex-start', py: 2 }}>
            {/* Calendars */}
            <Stack direction="row" spacing={2}>
                <Box>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block', letterSpacing: 0.5 }}>
                        START DATE
                    </Typography>
                    <StaticDatePicker
                        displayStaticWrapperAs="desktop"
                        value={startDate}
                        onChange={(val) => onRangeChange(val, endDate)}
                        slotProps={{
                            actionBar: { sx: { display: 'none' } },
                            toolbar: { hidden: true }
                        }}
                        sx={{
                            '& .MuiPickersLayout-root': { minWidth: 280, bgcolor: 'transparent' },
                            '& .MuiDateCalendar-root': { width: 280, height: 'auto', minHeight: 330, pb: 1 }
                        }}
                    />
                </Box>
                <Box>
                    <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block', letterSpacing: 0.5 }}>
                        END DATE
                    </Typography>
                    <StaticDatePicker
                        displayStaticWrapperAs="desktop"
                        value={endDate}
                        onChange={handleManualEndChange}
                        slotProps={{
                            actionBar: { sx: { display: 'none' } },
                            toolbar: { hidden: true }
                        }}
                        sx={{
                            '& .MuiPickersLayout-root': { minWidth: 280, bgcolor: 'transparent' },
                            '& .MuiDateCalendar-root': { width: 280, height: 'auto', minHeight: 330, pb: 1 }
                        }}
                    />
                </Box>
            </Stack>

            {/* Presets Sidebar (Now on the Right) */}
            <Box sx={{ width: 160, borderLeft: '1px solid', borderColor: 'divider', pl: 3 }}>
                <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Quick Select
                </Typography>
                <Stack spacing={0.5}>
                    {presets.map((p) => (
                        <Button
                            key={p.label}
                            onClick={() => handlePreset(p.label)}
                            size="small"
                            variant="text"
                            sx={{
                                justifyContent: 'flex-start',
                                textTransform: 'none',
                                fontSize: '0.85rem',
                                color: 'text.primary',
                                px: 1.5,
                                '&:hover': { bgcolor: 'action.hover' }
                            }}
                        >
                            {p.label}
                        </Button>
                    ))}
                </Stack>
            </Box>
        </Stack>
    )
}

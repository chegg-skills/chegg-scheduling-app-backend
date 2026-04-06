import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import { FilterX } from 'lucide-react'
import { TeamFilter } from './TeamFilter'
import { EventFilter } from './EventFilter'
import { DateRangeFilter } from './DateRangeFilter'

interface BookingFilterBarProps {
    filters: {
        teamId: string
        eventId: string
        startDate: Date | null
        endDate: Date | null
    }
    onFilterChange: (key: string, value: any) => void
    onReset: () => void
}

export function BookingFilterBar({ filters, onFilterChange, onReset }: BookingFilterBarProps) {
    const hasActiveFilters =
        Boolean(filters.teamId) ||
        Boolean(filters.eventId) ||
        Boolean(filters.startDate) ||
        Boolean(filters.endDate)

    return (
        <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
                <TeamFilter
                    value={filters.teamId}
                    onChange={(val) => onFilterChange('teamId', val)}
                />
                <EventFilter
                    teamId={filters.teamId || undefined}
                    value={filters.eventId}
                    onChange={(val) => onFilterChange('eventId', val)}
                />
                <DateRangeFilter
                    startDate={filters.startDate}
                    endDate={filters.endDate}
                    onStartDateChange={(val) => onFilterChange('startDate', val)}
                    onEndDateChange={(val) => onFilterChange('endDate', val)}
                />

                {hasActiveFilters && (
                    <Button
                        startIcon={<FilterX size={16} />}
                        onClick={onReset}
                        color="inherit"
                        size="small"
                        sx={{ ml: 'auto', textTransform: 'none' }}
                    >
                        Clear Filters
                    </Button>
                )}
            </Stack>
        </Box>
    )
}

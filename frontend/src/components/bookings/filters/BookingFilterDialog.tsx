import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { FilterX } from 'lucide-react'
import { Modal } from '@/components/shared/Modal'
import { TeamFilter } from './TeamFilter'
import { EventFilter } from './EventFilter'
import { AdvancedDateFilter } from './AdvancedDateFilter'

interface BookingFilterDialogProps {
    open: boolean
    onClose: () => void
    filters: {
        teamId: string
        eventId: string
        startDate: Date | null
        endDate: Date | null
    }
    onFilterChange: (key: string, value: any) => void
    onRangeChange: (start: Date | null, end: Date | null) => void
    onReset: () => void
}

export const BookingFilterDialog = ({
    open,
    onClose,
    filters,
    onFilterChange,
    onRangeChange,
    onReset,
}: BookingFilterDialogProps) => {
    const hasActiveFilters =
        Boolean(filters.teamId) ||
        Boolean(filters.eventId) ||
        Boolean(filters.startDate) ||
        Boolean(filters.endDate)

    return (
        <Modal
            isOpen={open}
            onClose={onClose}
            title="Filter Bookings"
            size="lg"
            footer={
                <>
                    {hasActiveFilters && (
                        <Button
                            startIcon={<FilterX size={16} />}
                            onClick={onReset}
                            color="inherit"
                            sx={{ textTransform: 'none', mr: 'auto' }}
                        >
                            Reset All
                        </Button>
                    )}
                    <Button onClick={onClose} variant="contained" sx={{ px: 4, textTransform: 'none', borderRadius: 2 }}>
                        Apply Filters
                    </Button>
                </>
            }
        >
            <Stack spacing={4}>
                {/* Organization Section */}
                <Box>
                    <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ mb: 2, display: 'block', letterSpacing: 1.2 }}>
                        ORGANIZATION & ACTIVITY
                    </Typography>
                    <Stack direction="row" spacing={3}>
                        <TeamFilter
                            value={filters.teamId}
                            onChange={(val) => onFilterChange('teamId', val)}
                        />
                        <EventFilter
                            teamId={filters.teamId || undefined}
                            value={filters.eventId}
                            onChange={(val) => onFilterChange('eventId', val)}
                        />
                    </Stack>
                </Box>

                {/* Date Section */}
                <Box>
                    <Typography variant="overline" color="primary.main" fontWeight={700} sx={{ mb: 2, display: 'block', letterSpacing: 1.2 }}>
                        DATE & TIME RANGE
                    </Typography>
                    <AdvancedDateFilter
                        startDate={filters.startDate}
                        endDate={filters.endDate}
                        onRangeChange={onRangeChange}
                    />
                </Box>
            </Stack>
        </Modal>
    )
}

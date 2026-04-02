import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import {
    useWeeklyAvailability,
    useUpdateWeeklyAvailability,
    useAvailabilityExceptions,
    useAddAvailabilityException,
    useRemoveAvailabilityException
} from '@/hooks/useAvailability'
import { WeeklyAvailabilityPicker } from './WeeklyAvailabilityPicker'
import { AvailabilityExceptionsManager } from './AvailabilityExceptionsManager'
import { PageSpinner } from '@/components/shared/Spinner'

interface AvailabilityViewProps {
    userId: string
}

export function AvailabilityView({ userId }: AvailabilityViewProps) {
    const { data: weekly, isLoading: isLoadingWeekly, error: errorWeekly } = useWeeklyAvailability(userId)
    const { data: exceptions, isLoading: isLoadingExceptions, error: errorExceptions } = useAvailabilityExceptions(userId)

    const updateWeekly = useUpdateWeeklyAvailability()
    const addException = useAddAvailabilityException()
    const removeException = useRemoveAvailabilityException()

    if (isLoadingWeekly || isLoadingExceptions) {
        return <PageSpinner />
    }

    if (errorWeekly || errorExceptions) {
        return (
            <Alert severity="error" sx={{ mt: 2 }}>
                Error loading availability data. Please try again later.
            </Alert>
        )
    }

    return (
        <Box sx={{ mt: 3 }}>
            {/* Container Box instead of Grid if Grid props are problematic */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', xl: 'row' }, gap: 4, alignItems: 'flex-start' }}>
                <Box sx={{ flex: { xl: '0 0 65%' }, minWidth: 0, width: '100%' }}>
                    <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom>Weekly Recurring Schedule</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            Set your default working hours for each day of the week. These will repeat indefinitely.
                        </Typography>
                        <WeeklyAvailabilityPicker
                            value={weekly || []}
                            onChange={(data) => updateWeekly.mutate({ userId, data })}
                            disabled={updateWeekly.isPending}
                        />
                    </Paper>
                </Box>

                <Box sx={{ flex: { xl: '0 0 35%' }, minWidth: 0, width: '100%' }}>
                    <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
                        <AvailabilityExceptionsManager
                            exceptions={exceptions || []}
                            onAdd={async (data) => {
                                await addException.mutateAsync({ userId, data })
                            }}
                            onRemove={async (exceptionId) => {
                                await removeException.mutateAsync({ userId, exceptionId })
                            }}
                            disabled={addException.isPending || removeException.isPending}
                        />
                        <Box sx={{ mt: 3 }}>
                            <Alert severity="info">
                                Exceptions take precedence over your weekly schedule for specific dates. Use them for vacations, holidays, or one-off schedule changes.
                            </Alert>
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    )
}

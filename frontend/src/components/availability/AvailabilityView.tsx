import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Alert from '@mui/material/Alert'
import {
  useWeeklyAvailability,
  useUpdateWeeklyAvailability,
  useAvailabilityExceptions,
  useAddAvailabilityException,
  useRemoveAvailabilityException,
} from '@/hooks/queries/useAvailability'
import { useAuth } from '@/context/AuthContext'
import { WeeklyAvailabilityPicker } from './WeeklyAvailabilityPicker'
import { AvailabilityExceptionsManager } from './AvailabilityExceptionsManager'
import { PageSpinner } from '@/components/shared/ui/Spinner'

interface AvailabilityViewProps {
  userId: string
}

export function AvailabilityView({ userId }: AvailabilityViewProps) {
  const { user: authUser } = useAuth()
  const {
    data: weekly,
    isLoading: isLoadingWeekly,
    error: errorWeekly,
  } = useWeeklyAvailability(userId)
  const {
    data: exceptions,
    isLoading: isLoadingExceptions,
    error: errorExceptions,
  } = useAvailabilityExceptions(userId)

  const updateWeekly = useUpdateWeeklyAvailability()
  const addException = useAddAvailabilityException()
  const removeException = useRemoveAvailabilityException()

  const isAdmin = authUser?.role === 'SUPER_ADMIN' || authUser?.role === 'TEAM_ADMIN'
  const isTargetSelf = authUser?.id === userId
  const showWeeklyEditor = isAdmin || (isTargetSelf && authUser?.role !== 'COACH')

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
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 4,
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ flex: { lg: '0 0 52%' }, minWidth: 0, width: '100%' }}>
          <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>
              Weekly Recurring Schedule
            </Typography>
            {showWeeklyEditor ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Set your default working hours for each day of the week. These will repeat
                  indefinitely.
                </Typography>
                <WeeklyAvailabilityPicker
                  value={weekly || []}
                  onChange={(data) => updateWeekly.mutate({ userId, data })}
                  disabled={updateWeekly.isPending}
                />
              </>
            ) : (
              <Box sx={{ py: 2 }}>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Your recurring weekly schedule is managed by an administrator. You can still set
                  date-specific exceptions and time off.
                </Alert>
                <WeeklyAvailabilityPicker
                  value={weekly || []}
                  onChange={() => {}}
                  disabled={true}
                />
              </Box>
            )}
          </Paper>
        </Box>

        <Box sx={{ flex: { lg: '0 0 43%' }, minWidth: 0, width: '100%' }}>
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
                Exceptions take precedence over your weekly schedule for specific dates. Use them
                for vacations, holidays, or one-off schedule changes.
              </Alert>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}

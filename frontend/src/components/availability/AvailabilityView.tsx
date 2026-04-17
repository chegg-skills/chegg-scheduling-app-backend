import { useState } from 'react'
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
import { useAuth } from '@/context/auth'
import { WeeklyAvailabilityPicker } from './WeeklyAvailabilityPicker'
import { AvailabilityExceptionsManager } from './AvailabilityExceptionsManager'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { extractApiError } from '@/utils/apiError'

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

  const [weeklyError, setWeeklyError] = useState<string | null>(null)
  const [exceptionError, setExceptionError] = useState<string | null>(null)

  const isAdmin = authUser?.role === 'SUPER_ADMIN' || authUser?.role === 'TEAM_ADMIN'
  const isTargetSelf = authUser?.id === userId
  const showWeeklyEditor = isAdmin || (isTargetSelf && authUser?.role !== 'COACH')

  if (isLoadingWeekly || isLoadingExceptions) {
    return <PageSpinner />
  }

  if (errorWeekly || errorExceptions) {
    return (
      <Box sx={{ mt: 2 }}>
        <ErrorAlert message="Error loading availability data. Please try again later." />
      </Box>
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
                {weeklyError && <ErrorAlert message={weeklyError} />}
                <WeeklyAvailabilityPicker
                  value={weekly || []}
                  onChange={(data) => {
                    setWeeklyError(null)
                    updateWeekly.mutate(
                      { userId, data },
                      { onError: (error) => setWeeklyError(extractApiError(error)) }
                    )
                  }}
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
                setExceptionError(null)
                try {
                  await addException.mutateAsync({ userId, data })
                } catch (error) {
                  setExceptionError(extractApiError(error))
                }
              }}
              onRemove={async (exceptionId) => {
                setExceptionError(null)
                try {
                  await removeException.mutateAsync({ userId, exceptionId })
                } catch (error) {
                  setExceptionError(extractApiError(error))
                }
              }}
              disabled={addException.isPending || removeException.isPending}
            />
            {exceptionError && (
              <Box sx={{ mt: 2 }}>
                <ErrorAlert message={exceptionError} />
              </Box>
            )}
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

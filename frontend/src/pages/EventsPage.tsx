import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import { CalendarDays, Plus, Repeat2, ToggleRight, Users } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/context/auth'
import { useTeams } from '@/hooks/queries/useTeams'
import { useTeamEvents } from '@/hooks/queries/useEvents'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { EventForm } from '@/components/events/form/EventForm'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventTable } from '@/components/events/table/EventTable'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { Select } from '@/components/shared/form/Select'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useEventStats } from '@/hooks/queries/useStats'
import type { StatsTimeframe } from '@/types'

export function EventsPage() {
  const { user } = useAuth()
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const canManageTeam = user?.role === 'SUPER_ADMIN'
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useTeams()
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useTeamEvents(selectedTeamId, { page: 1, pageSize: 100 })
  const { data: eventStats, isLoading: statsLoading } = useEventStats(
    timeframe,
    selectedTeamId || undefined
  )

  if (teamsLoading) return <PageSpinner />
  if (teamsError) return <ErrorAlert message="Failed to load teams." />

  const eventStatItems = [
    {
      label: 'Events created',
      value: eventStats?.metrics.newEvents ?? 0,
      helperText: 'Events created in the selected time frame',
      icon: <CalendarDays size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Active events',
      value: eventStats?.metrics.activeEvents ?? 0,
      helperText: 'Events currently available for booking',
      icon: <ToggleRight size={18} />,
      accent: 'green' as const,
    },
    {
      label: 'Round robin',
      value: eventStats?.metrics.roundRobinEvents ?? 0,
      helperText: 'Events using round-robin assignment',
      icon: <Repeat2 size={18} />,
      accent: 'purple' as const,
    },
    {
      label: 'Coached events',
      value: eventStats?.metrics.hostedEvents ?? 0,
      helperText: 'Events with at least one assigned host',
      icon: <Users size={18} />,
      accent: 'teal' as const,
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Events"
        subtitle="View events by team"
        actions={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Box
              sx={{
                width: { xs: '100%', sm: 280 },
                height: 40,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Box sx={{ position: 'relative', width: '100%' }}>
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    top: -10,
                    right: 12,
                    zIndex: 1,
                    px: 0.75,
                    backgroundColor: 'background.paper',
                    color: 'primary.main',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    borderRadius: 1,
                    lineHeight: 1.2,
                  }}
                >
                  Select team
                </Typography>

                <Select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value as string)}
                  displayEmpty
                  inputProps={{ 'aria-label': 'Select team' }}
                  renderValue={(value) => {
                    if (!value) {
                      return (
                        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                          Choose a team...
                        </Box>
                      )
                    }

                    return (
                      teamsData?.teams?.find((team) => team.id === value)?.name ??
                      'Choose a team...'
                    )
                  }}
                  sx={{
                    minWidth: { xs: '100%', sm: 280 },
                    backgroundColor: 'grey.50', // Brand-neutral soft background
                    borderRadius: 1.5, // 12px
                    height: 40,
                    minHeight: 40,
                    maxHeight: 40,
                    '& .MuiOutlinedInput-notchedOutline': {
                      border: 'none', // Borderless like search
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      border: 'none',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      border: '1.5px solid',
                      borderColor: 'primary.main',
                    },
                    '& .MuiSelect-select': {
                      height: 40,
                      minHeight: 40,
                      maxHeight: 40,
                      display: 'flex',
                      alignItems: 'center',
                      pl: 2,
                      py: 0,
                      fontWeight: 400,
                    },
                    '& .MuiSelect-icon': {
                      color: 'primary.main',
                      right: 8,
                    },
                  }}
                >
                  <MenuItem value="">Choose a team...</MenuItem>
                  {teamsData?.teams?.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </Box>
            {canManageTeam && (
              <Button
                size="sm"
                onClick={() => setShowCreateEvent(true)}
                disabled={!selectedTeamId}
                title={!selectedTeamId ? 'Please select a team first' : ''}
              >
                <Plus size={16} />
                New event
              </Button>
            )}
          </Stack>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={eventStats?.timeframe}
          items={eventStatItems}
          isLoading={statsLoading}
        />

        {selectedTeamId === '' ? (
          <Typography variant="body2" color="text.secondary">
            Please select a team to view its events.
          </Typography>
        ) : eventsLoading ? (
          <PageSpinner />
        ) : eventsError ? (
          <ErrorAlert message="Failed to load events." />
        ) : (
          <Box sx={{ mt: 3 }}>
            <EventTable
              events={eventsData?.events ?? []}
              teamId={selectedTeamId}
              onViewUser={setViewingUserId}
            />
          </Box>
        )}

        {canManageTeam && (
          <Modal
            isOpen={showCreateEvent}
            onClose={() => setShowCreateEvent(false)}
            title="New event"
            size="lg"
          >
            <EventForm
              teamId={selectedTeamId}
              onSuccess={() => setShowCreateEvent(false)}
              onCancel={() => setShowCreateEvent(false)}
            />
          </Modal>
        )}

        {viewingUserId && (
          <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
        )}
      </Box>
    </Box>
  )
}

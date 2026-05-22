import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { alpha } from '@mui/material/styles'
import {
  CalendarDays,
  Plus,
  Repeat2,
  ToggleRight,
  Users,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useAuth } from '@/context/auth'
import { useTeams } from '@/hooks/queries/useTeams'
import { useTeamEvents } from '@/hooks/queries/useEvents'
import { useTeamEventGroups } from '@/hooks/queries/useEventGroups'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { EventForm } from '@/components/events/form/EventForm'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventGroupSections } from '@/components/events/groups/EventGroupSections'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { Select } from '@/components/shared/form/Select'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { TeamQuickSelect } from '@/components/events/TeamQuickSelect'
import { useEventStats } from '@/hooks/queries/useStats'
import { useUsers } from '@/hooks/queries/useUsers'
import type { StatsTimeframe } from '@/types'
import { toTitleCase } from '@/utils/toTitleCase'

export function EventsPage() {
  const { user } = useAuth()
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const canManageTeam = user?.role === 'SUPER_ADMIN'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (selectedTeam?.publicBookingSlug) {
      const shareUrl = `${window.location.origin}/book/team/${selectedTeam.publicBookingSlug}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }
  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useTeams()
  const { data: usersData } = useUsers({ pageSize: 200 })

  const sortedTeams = useMemo(() => {
    if (!teamsData?.teams) return []
    return [...teamsData.teams].sort((a, b) => a.name.localeCompare(b.name))
  }, [teamsData?.teams])

  const selectedTeam = sortedTeams.find((team) => team.id === selectedTeamId)
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useTeamEvents(selectedTeamId, { page: 1, pageSize: 100 })
  const { data: groupsData } = useTeamEventGroups(selectedTeamId)
  const groups = useMemo(() => groupsData ?? [], [groupsData])
  const { data: eventStats, isLoading: statsLoading } = useEventStats(
    timeframe,
    selectedTeamId || undefined
  )

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
        title={selectedTeam ? toTitleCase(selectedTeam.name) : 'Events'}
        subtitle={selectedTeam ? (selectedTeam.description ?? undefined) : 'View events by team'}
        breadcrumbs={selectedTeam ? [{ label: 'Teams', to: '/teams' }] : undefined}
        actions={
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            {selectedTeam?.publicBookingSlug && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Tooltip title="Open booking page" arrow>
                  <IconButton
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/book/team/${selectedTeam.publicBookingSlug}`
                      window.open(shareUrl, '_blank', 'noopener,noreferrer')
                    }}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1.2,
                      width: 36,
                      height: 36,
                      color: 'text.secondary',
                      bgcolor: 'transparent',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        color: 'primary.main',
                        borderColor: 'primary.main',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <ExternalLink size={16} />
                  </IconButton>
                </Tooltip>

                <Tooltip title={copied ? 'Copied!' : 'Copy booking link'} arrow>
                  <IconButton
                    onClick={handleCopy}
                    sx={{
                      border: '1px solid',
                      borderColor: copied ? 'success.main' : 'divider',
                      borderRadius: 1.2,
                      width: 36,
                      height: 36,
                      bgcolor: (theme) =>
                        copied ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                      color: (theme) => (copied ? theme.palette.success.main : 'text.secondary'),
                      '&:hover': {
                        bgcolor: (theme) =>
                          copied ? alpha(theme.palette.success.main, 0.1) : 'action.hover',
                        color: (theme) => (copied ? theme.palette.success.main : 'primary.main'),
                        borderColor: (theme) =>
                          copied ? theme.palette.success.main : 'primary.main',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </IconButton>
                </Tooltip>
              </Stack>
            )}
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

                    return sortedTeams.find((team) => team.id === value)?.name ?? 'Choose a team...'
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
                  {sortedTeams.map((team) => (
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
        {teamsLoading ? (
          <PageSpinner />
        ) : teamsError ? (
          <Box sx={{ py: 4 }}>
            <ErrorAlert message="Failed to load teams. Please refresh the page." />
          </Box>
        ) : (
          <>
            <StatsOverview
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              timeframeInfo={eventStats?.timeframe}
              items={eventStatItems}
              isLoading={statsLoading}
            />

            {selectedTeamId === '' ? (
              <TeamQuickSelect
                teams={sortedTeams}
                users={usersData?.users ?? []}
                onSelectTeam={setSelectedTeamId}
              />
            ) : eventsLoading ? (
              <PageSpinner />
            ) : eventsError ? (
              <Box sx={{ py: 4 }}>
                <ErrorAlert message="Failed to load events. Please refresh the page." />
              </Box>
            ) : (
              <Box sx={{ mt: 3 }}>
                <EventGroupSections
                  groups={groups}
                  events={eventsData?.events ?? []}
                  teamId={selectedTeamId}
                  onViewUser={setViewingUserId}
                  canManage={canManageTeam}
                />
              </Box>
            )}
          </>
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

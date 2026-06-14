import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import InputAdornment from '@mui/material/InputAdornment'
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
  Info,
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useTeams } from '@/hooks/queries/useTeams'
import { useTeamEvents, useEvents } from '@/hooks/queries/useEvents'
import { useEventTypes } from '@/hooks/queries/useEventTypes'
import { useTeamEventGroups } from '@/hooks/queries/useEventGroups'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { EventForm } from '@/components/events/form/EventForm'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventTypeEventsList } from '@/components/events/list/EventTypeEventsList'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { Select } from '@/components/shared/form/Select'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useEventStats } from '@/hooks/queries/useStats'
import { toTitleCase } from '@/utils/toTitleCase'
import type { StatsTimeframe } from '@/types'

export function EventsPage() {
  const { isCoach, isSuperAdmin } = usePermissions()
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>('')
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const canManageTeam = isSuperAdmin
  const [copied, setCopied] = useState(false)

  const { data: teamsData, isLoading: teamsLoading, error: teamsError } = useTeams()
  const { data: eventTypes = [], isLoading: eventTypesLoading, error: eventTypesError } = useEventTypes()

  const sortedTeams = useMemo(() => {
    if (!teamsData?.teams) return []
    return [...teamsData.teams].sort((a, b) => a.name.localeCompare(b.name))
  }, [teamsData?.teams])

  const selectedTeam = sortedTeams.find((team) => team.id === selectedTeamId)
  const selectedEventType = eventTypes.find((et) => et.id === selectedEventTypeId)
  
  const isAllTeams = selectedTeamId === 'all'

  const {
    data: teamEventsData,
    isLoading: teamEventsLoading,
    error: teamEventsError,
  } = useTeamEvents(isAllTeams ? '' : selectedTeamId, { page: 1, pageSize: 1000 })

  const {
    data: allEventsData,
    isLoading: allEventsLoading,
    error: allEventsError,
  } = useEvents({ page: 1, pageSize: 1000 }, { enabled: isAllTeams })

  const eventsData = isAllTeams ? allEventsData : teamEventsData
  const eventsLoading = isAllTeams ? allEventsLoading : teamEventsLoading
  const eventsError = isAllTeams ? allEventsError : teamEventsError

  const { data: groupsData } = useTeamEventGroups(isAllTeams ? '' : selectedTeamId)
  const groups = useMemo(() => groupsData ?? [], [groupsData])

  const { data: eventStats, isLoading: statsLoading } = useEventStats(
    timeframe,
    isAllTeams ? undefined : (selectedTeamId || undefined),
    { enabled: !isCoach }
  )

  const handleCopy = async () => {
    if (selectedTeam?.publicBookingSlug && selectedEventType?.key) {
      const shareUrl = `${window.location.origin}/book/sessions/${selectedEventType.key}/${selectedTeam.publicBookingSlug}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const activeEventTypes = useMemo(() => {
    return eventTypes.filter((et) => et.isActive)
  }, [eventTypes])

  const filteredEvents = useMemo(() => {
    if (!eventsData?.events) return []
    return eventsData.events.filter((e) => e.eventTypeId === selectedEventTypeId)
  }, [eventsData?.events, selectedEventTypeId])

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
        subtitle="View and manage event schedules."
        actions={
          canManageTeam && (
            <Button
              size="sm"
              onClick={() => setShowCreateEvent(true)}
            >
              <Plus size={16} />
              New event
            </Button>
          )
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
            {!isCoach && (
              <StatsOverview
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                timeframeInfo={eventStats?.timeframe}
                items={eventStatItems}
                isLoading={statsLoading}
              />
            )}

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} sx={{ mt: 3, alignItems: 'flex-start' }}>
              {/* Left Column: Event Types Sidebar */}
              <Box sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }}>
                {eventTypesLoading ? (
                  <PageSpinner />
                ) : eventTypesError ? (
                  <ErrorAlert message="Failed to load event types." />
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{
                      borderRadius: 1.5,
                      overflow: 'hidden',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      p: 2,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: 'text.secondary',
                        letterSpacing: '0.08em',
                        display: 'block',
                        mb: 2,
                        px: 1,
                      }}
                    >
                      Event Types
                    </Typography>
                    <Stack spacing={0.5}>
                      {activeEventTypes.map((item) => {
                        const isActive = selectedEventTypeId === item.id
                        const count = eventsData?.events?.filter((e) => e.eventTypeId === item.id).length || 0
                        return (
                          <Box
                            key={item.id}
                            onClick={() => setSelectedEventTypeId(item.id)}
                            sx={{
                              py: 1.5,
                              px: 2,
                              borderRadius: 1.5,
                              cursor: 'pointer',
                              position: 'relative',
                              bgcolor: isActive ? 'primary.lighter' : 'transparent',
                              color: isActive ? 'primary.main' : 'text.secondary',
                              fontWeight: isActive ? 600 : 500,
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.75,
                              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                              borderLeft: '3px solid',
                              borderLeftColor: isActive ? 'primary.main' : 'transparent',
                              pl: isActive ? 1.75 : 2,
                              '&:hover': {
                                bgcolor: isActive ? 'primary.lighter' : 'action.hover',
                                color: isActive ? 'primary.main' : 'text.primary',
                              },
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.875rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {item.name}
                            </Typography>
                            {selectedTeamId && (
                              <Box
                                sx={{
                                  ml: 'auto',
                                  fontSize: '0.725rem',
                                  fontWeight: 700,
                                  px: 1,
                                  py: 0.2,
                                  borderRadius: 1.5,
                                  bgcolor: isActive ? 'primary.main' : 'action.hover',
                                  color: isActive ? 'primary.contrastText' : 'text.secondary',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                {count}
                              </Box>
                            )}
                          </Box>
                        )
                      })}
                    </Stack>
                  </Paper>
                )}
              </Box>

              {/* Right Column: Events & Filter Panel */}
              <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
                {!selectedEventTypeId ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 6,
                      textAlign: 'center',
                      color: 'text.secondary',
                      borderRadius: 1.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Info size={36} style={{ color: alpha('#E87100', 0.5) }} />
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                        Select an Event Type
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Please select an event type from the left sidebar to start viewing and managing events.
                      </Typography>
                    </Box>
                  </Paper>
                ) : (
                  <Stack spacing={3}>
                    {/* Event Type Header & Team Selector Container */}
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 3,
                        borderRadius: 1.5,
                        backgroundColor: (theme) => theme.palette.accent.peach,
                        borderColor: (theme) => alpha(theme.palette.primary.main, 0.15),
                        boxShadow: '0 2px 12px rgba(232, 113, 0, 0.03)',
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                            {eventTypes.find(et => et.id === selectedEventTypeId)?.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {eventTypes.find(et => et.id === selectedEventTypeId)?.description || 'No description provided.'}
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ alignSelf: { xs: 'flex-start', sm: 'auto' } }}>
                          {selectedTeam?.publicBookingSlug && selectedEventType?.key && (
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Tooltip title={`Open all ${selectedEventType.name} link for ${toTitleCase(selectedTeam.name)}`} arrow>
                                <IconButton
                                  onClick={() => {
                                    const shareUrl = `${window.location.origin}/book/sessions/${selectedEventType.key}/${selectedTeam.publicBookingSlug}`
                                    window.open(shareUrl, '_blank', 'noopener,noreferrer')
                                  }}
                                  sx={{
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1.5,
                                    width: 38,
                                    height: 38,
                                    color: 'text.secondary',
                                    bgcolor: 'background.paper',
                                    '&:hover': {
                                      bgcolor: 'action.hover',
                                      color: 'primary.main',
                                      borderColor: 'primary.main',
                                    },
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <ExternalLink size={16} />
                                </IconButton>
                              </Tooltip>

                              <Tooltip title={copied ? 'Copied!' : `All ${selectedEventType.name} link for ${toTitleCase(selectedTeam.name)}`} arrow>
                                <IconButton
                                  onClick={handleCopy}
                                  sx={{
                                    border: '1px solid',
                                    borderColor: copied ? 'success.main' : 'divider',
                                    borderRadius: 1.5,
                                    width: 38,
                                    height: 38,
                                    bgcolor: (theme) =>
                                      copied ? alpha(theme.palette.success.main, 0.1) : 'background.paper',
                                    color: (theme) => (copied ? theme.palette.success.main : 'text.secondary'),
                                    '&:hover': {
                                      bgcolor: (theme) =>
                                        copied ? alpha(theme.palette.success.main, 0.1) : 'action.hover',
                                      color: (theme) => (copied ? theme.palette.success.main : 'primary.main'),
                                      borderColor: (theme) =>
                                        copied ? theme.palette.success.main : 'primary.main',
                                    },
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  {copied ? <Check size={16} /> : <Copy size={16} />}
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          )}

                          <Box sx={{ width: 320 }}>
                            <Select
                              value={selectedTeamId}
                              onChange={(e) => setSelectedTeamId(e.target.value as string)}
                              displayEmpty
                              inputProps={{ 'aria-label': 'Select team' }}
                              startAdornment={
                                <InputAdornment
                                  position="start"
                                  sx={{
                                    color: selectedTeamId === 'all' ? 'primary.main' : 'text.secondary',
                                    ml: 0.5,
                                    transition: 'color 0.2s',
                                  }}
                                >
                                  <Users size={18} />
                                </InputAdornment>
                              }
                              sx={{
                                transition: 'all 0.2s',
                                ...(selectedTeamId === 'all' && {
                                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                  color: 'primary.main',
                                  fontWeight: 700,
                                  '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
                                  },
                                  '&:hover .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                  },
                                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                    borderColor: 'primary.main',
                                  },
                                  '& .MuiSelect-select': {
                                    color: 'primary.main',
                                    fontWeight: 700,
                                  },
                                  '& .MuiSelect-icon': {
                                    color: 'primary.main',
                                  },
                                }),
                              }}
                              renderValue={(value) => {
                                if (!value) {
                                  return <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>Choose a team...</Box>
                                }
                                if (value === 'all') {
                                  return 'All teams'
                                }
                                const team = sortedTeams.find((t) => t.id === value)
                                return team ? toTitleCase(team.name) : 'Choose a team...'
                              }}
                              MenuProps={{
                                PaperProps: {
                                  style: {
                                    width: 320,
                                  },
                                },
                              }}
                            >
                              <MenuItem value="" disabled>Choose a team...</MenuItem>
                              {sortedTeams.map((team) => (
                                <MenuItem key={team.id} value={team.id}>
                                  {toTitleCase(team.name)}
                                </MenuItem>
                              ))}
                              <MenuItem
                                value="all"
                                sx={{
                                  borderTop: '1px solid',
                                  borderColor: 'divider',
                                  color: 'primary.main',
                                  fontWeight: 600,
                                  py: 1.25,
                                  px: 2,
                                  '&:hover': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                  },
                                  '&.Mui-selected': {
                                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                    fontWeight: 700,
                                    '&:hover': {
                                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                                    },
                                  },
                                }}
                              >
                                All teams
                              </MenuItem>
                            </Select>
                          </Box>
                        </Stack>
                      </Stack>
                    </Paper>

                     {!selectedTeamId ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 6,
                          textAlign: 'center',
                          color: 'text.secondary',
                          borderRadius: 1.5,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Users size={36} style={{ color: alpha('#E87100', 0.5) }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
                            Select a Team
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Please select a team from the dropdown to load the events configured for this event type.
                          </Typography>
                        </Box>
                      </Paper>
                    ) : eventsLoading ? (
                      <PageSpinner />
                    ) : eventsError ? (
                      <Box sx={{ py: 4 }}>
                        <ErrorAlert message="Failed to load events. Please refresh the page." />
                      </Box>
                    ) : (
                      <EventTypeEventsList
                        events={filteredEvents}
                        eventTypes={eventTypes}
                        selectedEventTypeId={selectedEventTypeId}
                        onViewUser={setViewingUserId}
                        canManage={canManageTeam}
                        groups={groups}
                        isAllTeams={isAllTeams}
                      />
                    )}
                  </Stack>
                )}
              </Box>
            </Stack>
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
              teamId={selectedTeamId === 'all' ? '' : selectedTeamId}
              accessedFromEventsTab={true}
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

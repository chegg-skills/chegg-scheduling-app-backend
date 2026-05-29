import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { alpha } from '@mui/material/styles'
import { useParams } from 'react-router-dom'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Calendar,
  Bell,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useTeam, useDeleteTeam, useUpdateTeam } from '@/hooks/queries/useTeams'
import { useTeamEvents } from '@/hooks/queries/useEvents'
import { useTeamMembers } from '@/hooks/queries/useTeamMembers'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { PageHeader } from '@/components/shared/PageHeader'
import { TabPanel } from '@/components/shared/ui/TabPanel'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { Badge } from '@/components/shared/ui/Badge'
import { TeamForm } from '@/components/teams/TeamForm'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { RowActions } from '@/components/shared/table/RowActions'
import { TeamMembersTab } from '@/components/teams/tabs/TeamMembersTab'
import { TeamEventsTab } from '@/components/teams/tabs/TeamEventsTab'
import { TeamNotificationsTab } from '@/components/teams/tabs/TeamNotificationsTab'
import { useTeamEventGroups } from '@/hooks/queries/useEventGroups'
import { toTitleCase } from '@/utils/toTitleCase'

export function TeamDetailPage() {
  const { teamId = '' } = useParams<{ teamId: string }>()
  const { isCoach, isTeamAdmin, isSuperAdmin, isAdmin, role } = usePermissions()
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const { handleAction } = useAsyncAction()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (team?.publicBookingSlug) {
      const shareUrl = `${window.location.origin}/book/team/${team.publicBookingSlug}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const {
    data: membersResponse,
    isLoading: membersLoading,
    error: membersError,
  } = useTeamMembers(teamId)
  const { data: events, isLoading: eventsLoading, error: eventsError } = useTeamEvents(teamId)
  const { data: groups } = useTeamEventGroups(teamId)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const canManageTeam = isSuperAdmin

  const members = membersResponse?.members ?? []
  const teamEvents = events?.events ?? []
  const existingMemberIds = members.map((m) => m.userId)

  if (teamLoading) return <PageSpinner />
  if (teamError || !team) {
    return (
      <Stack spacing={4}>
        <PageHeader title="Team" backTo="/teams" backLabel="Teams" />
        <Box sx={{ px: { xs: 2.5, md: 4 }, py: 4 }}>
          <ErrorAlert message="Failed to load team details. Please go back and try again." />
        </Box>
      </Stack>
    )
  }

  return (
    <Stack spacing={4}>
      <PageHeader
        title={toTitleCase(team.name)}
        breadcrumbs={[{ label: 'Teams', to: '/teams' }]}
        tags={
          <Badge
            label={team.isActive ? 'Active' : 'Inactive'}
            color={team.isActive ? 'green' : 'red'}
          />
        }
        actions={
          <Stack direction="row" spacing={1.5} alignItems="center">
            {team.publicBookingSlug && (
              <>
                <Tooltip title="Open booking page" arrow>
                  <IconButton
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/book/team/${team.publicBookingSlug}`
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
              </>
            )}
            {canManageTeam && (
              <RowActions
                actions={[
                  {
                    label: 'Edit team details',
                    icon: <Edit size={16} />,
                    onClick: () => setShowEditTeam(true),
                  },
                  {
                    label: team.isActive ? 'Mark as Inactive' : 'Mark as Active',
                    icon: team.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                    onClick: async () => {
                      const newStatus = !team.isActive
                      handleAction(
                        updateTeam,
                        { teamId, data: { isActive: newStatus } },
                        {
                          title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
                          message: newStatus
                            ? `Are you sure you want to mark team "${team.name}" as active? This will make it visible on the public booking page.`
                            : `Are you sure you want to mark team "${team.name}" as inactive? This will hide it from the public booking page but keep its configuration.`,
                          actionName: 'Update',
                        }
                      )
                    },
                  },
                  {
                    label: 'Delete team',
                    icon: <Trash2 size={16} />,
                    color: 'error.main',
                    onClick: async () => {
                      handleAction(deleteTeam, teamId, {
                        title: 'Delete Team',
                        message: `Are you sure you want to PERMANENTLY delete team "${team.name}"?\n\nThis action cannot be undone and will remove all associated events and memberships.`,
                        actionName: 'Delete',
                      })
                    },
                  },
                ]}
              />
            )}
          </Stack>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            mt: 2,
            mb: 3,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_, newValue: number) => setTabValue(newValue)}
            aria-label="team detail sections"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              label={`Events (${teamEvents.length})`}
              icon={<Calendar size={18} />}
              iconPosition="start"
            />
            <Tab
              label={`Members (${members.length})`}
              icon={<Users size={18} />}
              iconPosition="start"
            />
            <Tab label="Notifications" icon={<Bell size={18} />} iconPosition="start" />
          </Tabs>

          <Box sx={{ mb: 1 }}>
            {!isCoach && tabValue === 0 && (
              <Button size="sm" onClick={() => setShowCreateEvent(true)}>
                <Plus size={16} /> New event
              </Button>
            )}
            {!isCoach && tabValue === 1 && (
              <Button size="sm" onClick={() => setShowAddMember(true)}>
                <Plus size={16} /> Add member
              </Button>
            )}
          </Box>
        </Box>

        <TabPanel value={tabValue} index={0} prefix="team">
          <TeamEventsTab
            events={teamEvents}
            groups={groups ?? []}
            teamId={teamId}
            isLoading={eventsLoading}
            error={eventsError}
            canManage={canManageTeam || isTeamAdmin}
            showCreateModal={showCreateEvent}
            onCloseCreateModal={() => setShowCreateEvent(false)}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1} prefix="team">
          <TeamMembersTab
            members={members}
            teamId={teamId}
            currentUserRole={role ?? 'TEAM_ADMIN'}
            teamLeadId={team.teamLeadId}
            isLoading={membersLoading}
            error={membersError}
            existingMemberIds={existingMemberIds}
            showAddModal={showAddMember}
            onCloseAddModal={() => setShowAddMember(false)}
            onViewUser={setViewingUserId}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2} prefix="team">
          <TeamNotificationsTab
            teamId={teamId}
            canEdit={isAdmin}
          />
        </TabPanel>
      </Box>

      {canManageTeam && (
        <Modal isOpen={showEditTeam} onClose={() => setShowEditTeam(false)} title="Edit team">
          <TeamForm
            team={team}
            onSuccess={() => setShowEditTeam(false)}
            onCancel={() => setShowEditTeam(false)}
          />
        </Modal>
      )}

      {viewingUserId && (
        <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </Stack>
  )
}

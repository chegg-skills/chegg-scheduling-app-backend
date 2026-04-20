import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useParams } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff, Users, Calendar } from 'lucide-react'
import { useAuth } from '@/context/auth'
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

export function TeamDetailPage() {
  const { teamId = '' } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const { handleAction } = useAsyncAction()

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const {
    data: membersResponse,
    isLoading: membersLoading,
    error: membersError,
  } = useTeamMembers(teamId)
  const { data: events, isLoading: eventsLoading, error: eventsError } = useTeamEvents(teamId)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const canManageTeam = user?.role === 'SUPER_ADMIN'

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
        title={team.name}
        subtitle={team.description ?? undefined}
        backTo="/teams"
        backLabel="Teams"
        tags={
          <Badge
            label={team.isActive ? 'Active' : 'Inactive'}
            variant={team.isActive ? 'green' : 'red'}
          />
        }
        actions={
          canManageTeam ? (
            <Stack direction="row" spacing={1} alignItems="center">
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
            </Stack>
          ) : null
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
          </Tabs>

          <Box sx={{ mb: 1 }}>
            <Button
              size="sm"
              onClick={() => (tabValue === 0 ? setShowCreateEvent(true) : setShowAddMember(true))}
            >
              <Plus size={16} /> {tabValue === 0 ? 'New event' : 'Add member'}
            </Button>
          </Box>
        </Box>

        <TabPanel value={tabValue} index={0} prefix="team">
          <TeamEventsTab
            events={teamEvents}
            teamId={teamId}
            isLoading={eventsLoading}
            error={eventsError}
            showCreateModal={showCreateEvent}
            onCloseCreateModal={() => setShowCreateEvent(false)}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1} prefix="team">
          <TeamMembersTab
            members={members}
            teamId={teamId}
            currentUserRole={user?.role ?? 'TEAM_ADMIN'}
            teamLeadId={team.teamLeadId}
            isLoading={membersLoading}
            error={membersError}
            existingMemberIds={existingMemberIds}
            showAddModal={showAddMember}
            onCloseAddModal={() => setShowAddMember(false)}
            onViewUser={setViewingUserId}
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

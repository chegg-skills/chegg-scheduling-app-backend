import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useParams } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTeam, useDeleteTeam, useUpdateTeam } from '@/hooks/useTeams'
import { useTeamEvents } from '@/hooks/useEvents'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useConfirm } from '@/context/ConfirmContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Badge } from '@/components/shared/Badge'
import { TeamForm } from '@/components/teams/TeamForm'
import { TeamMemberList } from '@/components/team-members/TeamMemberList'
import { AddMemberForm } from '@/components/team-members/AddMemberForm'
import { EventTable } from '@/components/events/EventTable'
import { EventForm } from '@/components/events/EventForm'
import { RowActions } from '@/components/shared/RowActions'

export function TeamDetailPage() {
  const { teamId = '' } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const { confirm } = useConfirm()

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const { data: membersResponse, isLoading: membersLoading, error: membersError } = useTeamMembers(teamId)
  const { data: events, isLoading: eventsLoading, error: eventsError } = useTeamEvents(teamId)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const canManageTeam = user?.role === 'SUPER_ADMIN'

  const members = membersResponse?.members ?? []
  const existingMemberIds = members.map((member) => member.userId)

  if (teamLoading) return <PageSpinner />
  if (teamError || !team) return <ErrorAlert message="Failed to load team details." />
  if (membersError) return <ErrorAlert message="Failed to load team members." />
  if (eventsError) return <ErrorAlert message="Failed to load team events." />

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
                      if (
                        await confirm({
                          title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
                          message: newStatus
                            ? `Are you sure you want to mark team "${team.name}" as active? This will make it visible on the public booking page.`
                            : `Are you sure you want to mark team "${team.name}" as inactive? This will hide it from the public booking page but keep its configuration.`,
                        })
                      ) {
                        updateTeam({ teamId, data: { isActive: newStatus } })
                      }
                    },
                  },
                  {
                    label: 'Delete team',
                    icon: <Trash2 size={16} />,
                    color: 'error.main',
                    onClick: async () => {
                      if (
                        await confirm({
                          title: 'Delete Team',
                          message: `Are you sure you want to PERMANENTLY delete team "${team.name}"?\n\nThis action cannot be undone and will remove all associated events and memberships.`,
                        })
                      ) {
                        deleteTeam(teamId)
                      }
                    },
                  },
                ]}
              />
            </Stack>
          ) : null
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <Box component="section">
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2}>
            <Typography variant="h6">Members</Typography>
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              <Plus size={16} /> Add member
            </Button>
          </Stack>
          {membersLoading ? (
            <PageSpinner />
          ) : (
            <TeamMemberList
              members={members}
              teamId={teamId}
              currentUserRole={user?.role ?? 'TEAM_ADMIN'}
              teamLeadId={team.teamLeadId}
            />
          )}
        </Box>

        <Box component="section" mt={4}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2}>
            <Typography variant="h6">Events</Typography>
            <Button size="sm" onClick={() => setShowCreateEvent(true)}>
              <Plus size={16} /> New event
            </Button>
          </Stack>
          {eventsLoading ? (
            <PageSpinner />
          ) : (
            <EventTable events={events?.events ?? []} teamId={teamId} />
          )}
        </Box>
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

      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add member">
        <AddMemberForm
          teamId={teamId}
          existingMemberIds={existingMemberIds}
          onSuccess={() => setShowAddMember(false)}
          onCancel={() => setShowAddMember(false)}
        />
      </Modal>

      <Modal isOpen={showCreateEvent} onClose={() => setShowCreateEvent(false)} title="New event" size="lg">
        <EventForm
          teamId={teamId}
          onSuccess={() => setShowCreateEvent(false)}
          onCancel={() => setShowCreateEvent(false)}
        />
      </Modal>
    </Stack>
  )
}

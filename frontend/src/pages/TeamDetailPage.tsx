import { useState } from 'react'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Plus, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTeam, useDeactivateTeam } from '@/hooks/useTeams'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useTeamEvents } from '@/hooks/useEvents'
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

export function TeamDetailPage() {
  const { teamId = '' } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const { data: membersResponse, isLoading: membersLoading, error: membersError } = useTeamMembers(teamId)
  const { data: events, isLoading: eventsLoading, error: eventsError } = useTeamEvents(teamId)
  const deactivateTeam = useDeactivateTeam()
  const canManageTeam = user?.role === 'SUPER_ADMIN'

  const members = membersResponse?.members ?? []
  const existingMemberIds = members.map((member) => member.userId)

  if (teamLoading) return <PageSpinner />
  if (teamError || !team) return <ErrorAlert message="Failed to load team details." />
  if (membersError) return <ErrorAlert message="Failed to load team members." />
  if (eventsError) return <ErrorAlert message="Failed to load team events." />

  return (
    <Stack spacing={4}>
      <Box>
        <Link component={RouterLink} to="/teams" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <ChevronLeft size={16} /> Back to teams
        </Link>
        <PageHeader
          title={team.name}
          subtitle={team.description ?? undefined}
          actions={
            canManageTeam ? (
              <Stack direction="row" spacing={1}>
                <Button variant="secondary" size="sm" onClick={() => setShowEditTeam(true)}>
                  Edit team
                </Button>
                {team.isActive && (
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={deactivateTeam.isPending}
                    onClick={() => deactivateTeam.mutate(teamId)}
                  >
                    Deactivate
                  </Button>
                )}
              </Stack>
            ) : null
          }
        />
        <Badge
          label={team.isActive ? 'Active' : 'Inactive'}
          variant={team.isActive ? 'green' : 'red'}
        />
      </Box>

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
          />
        )}
      </Box>

      <Box component="section">
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

      {canManageTeam && (
        <Modal isOpen={showEditTeam} onClose={() => setShowEditTeam(false)} title="Edit team">
          <TeamForm team={team} onSuccess={() => setShowEditTeam(false)} />
        </Modal>
      )}

      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add member">
        <AddMemberForm
          teamId={teamId}
          existingMemberIds={existingMemberIds}
          onSuccess={() => setShowAddMember(false)}
        />
      </Modal>

      <Modal isOpen={showCreateEvent} onClose={() => setShowCreateEvent(false)} title="New event" size="lg">
        <EventForm teamId={teamId} onSuccess={() => setShowCreateEvent(false)} />
      </Modal>
    </Stack>
  )
}

import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useParams } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff, Users, Calendar } from 'lucide-react'
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

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`team-tabpanel-${index}`}
      aria-labelledby={`team-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>{children}</Box>
      )}
    </div>
  )
}

export function TeamDetailPage() {
  const { teamId = '' } = useParams<{ teamId: string }>()
  const { user } = useAuth()
  const [showEditTeam, setShowEditTeam] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const { confirm } = useConfirm()

  const { data: team, isLoading: teamLoading, error: teamError } = useTeam(teamId)
  const { data: membersResponse, isLoading: membersLoading, error: membersError } = useTeamMembers(teamId)
  const { data: events, isLoading: eventsLoading, error: eventsError } = useTeamEvents(teamId)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const canManageTeam = user?.role === 'SUPER_ADMIN'

  const members = membersResponse?.members ?? []
  const teamEvents = events?.events ?? []
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
              label={`Members (${members.length})`}
              icon={<Users size={18} />}
              iconPosition="start"
            />
            <Tab
              label={`Events (${teamEvents.length})`}
              icon={<Calendar size={18} />}
              iconPosition="start"
            />
          </Tabs>

          <Box sx={{ mb: 1 }}>
            <Button
              size="sm"
              onClick={() => (tabValue === 0 ? setShowAddMember(true) : setShowCreateEvent(true))}
            >
              <Plus size={16} /> {tabValue === 0 ? 'Add member' : 'New event'}
            </Button>
          </Box>
        </Box>

        <TabPanel value={tabValue} index={0}>
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
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {eventsLoading ? (
            <PageSpinner />
          ) : (
            <EventTable events={teamEvents} teamId={teamId} />
          )}
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

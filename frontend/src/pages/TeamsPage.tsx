import Box from '@mui/material/Box'
import { useState } from 'react'
import {
  CalendarDays,
  Plus,
  ToggleRight,
  Users,
  UsersRound,
  LayoutList,
  LayoutGrid,
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useTeams, useDeleteTeam, useUpdateTeam } from '@/hooks/queries/useTeams'
import { useUsers } from '@/hooks/queries/useUsers'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { TeamTable } from '@/components/teams/TeamTable'
import { TeamQuickSelect } from '@/components/events/TeamQuickSelect'
import { TeamForm } from '@/components/teams/TeamForm'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useTeamStats } from '@/hooks/queries/useStats'
import type { StatsTimeframe, Team } from '@/types'
import { usePagination } from '@/hooks/usePagination'
import { useNavigate } from 'react-router-dom'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { alpha, useTheme } from '@mui/material/styles'
import { TablePagination } from '@/components/shared/table/TablePagination'
import { useAsyncAction } from '@/hooks/useAsyncAction'

export function TeamsPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { isCoach, isSuperAdmin } = usePermissions()
  const { pageSize, backendPage, onPageChange, onRowsPerPageChange } = usePagination(20)

  const [showCreate, setShowCreate] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
    const saved = localStorage.getItem('teams_view_mode')
    return saved === 'card' ? 'card' : 'table'
  })
  const canManageTeam = isSuperAdmin

  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const { handleAction } = useAsyncAction()

  const { data, isLoading, error } = useTeams({
    page: backendPage,
    pageSize,
  })
  const { data: usersData } = useUsers({ pageSize: 200 }, { enabled: !isCoach })
  const { data: teamStats, isLoading: statsLoading } = useTeamStats(timeframe, {
    enabled: !isCoach,
  })

  async function handleToggleActive(team: Team) {
    const newStatus = !team.isActive

    handleAction(
      updateTeam,
      { teamId: team.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
        message: newStatus
          ? `Are you sure you want to mark team "${team.name}" as active? This will make it visible on the public booking page.`
          : `Are you sure you want to mark team "${team.name}" as inactive? This will hide it from the public booking page and prevent new bookings, but keep its configuration.`,
        actionName: 'Update',
      }
    )
  }

  async function handleDelete(team: Team) {
    handleAction(deleteTeam, team.id, {
      title: 'Delete Team',
      message: `Are you sure you want to PERMANENTLY delete team "${team.name}"?\n\nThis action cannot be undone and will remove all associated events and memberships.`,
      actionName: 'Delete',
    })
  }

  const teams = data?.teams ?? []
  const pagination = data?.pagination

  const teamStatItems = [
    {
      label: 'New teams',
      value: teamStats?.metrics.newTeams ?? 0,
      helperText: 'Teams created in the selected time frame',
      icon: <UsersRound size={18} />,
      accent: 'orange' as const,
    },
    {
      label: 'Active teams',
      value: teamStats?.metrics.activeTeams ?? 0,
      helperText: 'Teams currently enabled for use',
      icon: <ToggleRight size={18} />,
      accent: 'green' as const,
    },
    {
      label: 'Active members',
      value: teamStats?.metrics.activeMembers ?? 0,
      helperText: 'Members actively assigned to teams',
      icon: <Users size={18} />,
      accent: 'teal' as const,
    },
    {
      label: 'Teams with events',
      value: teamStats?.metrics.teamsWithEvents ?? 0,
      helperText: 'Teams already configured for scheduling',
      icon: <CalendarDays size={18} />,
      accent: 'purple' as const,
    },
  ]

  return (
    <Box>
      <PageHeader
        title="Teams"
        subtitle={`${pagination?.total ?? 0} total teams`}
        actions={
          canManageTeam ? (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus size={16} />
              New team
            </Button>
          ) : null
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        {isLoading && !data ? (
          <PageSpinner />
        ) : error ? (
          <Box sx={{ py: 4 }}>
            <ErrorAlert message="Failed to load teams. Please refresh the page." />
          </Box>
        ) : (
          <>
            {!isCoach && (
              <StatsOverview
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                timeframeInfo={teamStats?.timeframe}
                items={teamStatItems}
                isLoading={statsLoading}
              />
            )}

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                mt: 4,
                mb: 2,
              }}
            >
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, next) => {
                  if (next) {
                    setViewMode(next)
                    localStorage.setItem('teams_view_mode', next)
                  }
                }}
                size="small"
                sx={{
                  bgcolor: 'background.paper',
                  '& .MuiToggleButton-root': {
                    px: 2,
                    py: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.12),
                      },
                    },
                  },
                }}
              >
                <ToggleButton value="table">
                  <LayoutList size={16} style={{ marginRight: 8 }} />
                  Table
                </ToggleButton>
                <ToggleButton value="card">
                  <LayoutGrid size={16} style={{ marginRight: 8 }} />
                  Cards
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {viewMode === 'table' ? (
              <Box sx={{ mt: 1 }}>
                <TeamTable
                  teams={teams}
                  users={usersData?.users ?? []}
                  pagination={pagination}
                  onPageChange={onPageChange}
                  onRowsPerPageChange={onRowsPerPageChange}
                  canManageTeam={canManageTeam}
                  onEdit={setEditingTeam}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              </Box>
            ) : (
              <Box sx={{ mt: 1 }}>
                <TeamQuickSelect
                  teams={teams}
                  users={usersData?.users ?? []}
                  onSelectTeam={(teamId) => navigate(`/teams/${teamId}`)}
                  actionLabel="View Details"
                  showSectionHeader={false}
                  canManageTeam={canManageTeam}
                  onEdit={setEditingTeam}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
                {pagination && (
                  <Box
                    sx={{
                      mt: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <TablePagination
                      pagination={pagination}
                      onPageChange={onPageChange}
                      onRowsPerPageChange={onRowsPerPageChange}
                    />
                  </Box>
                )}
              </Box>
            )}
          </>
        )}

        {canManageTeam && (
          <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create team">
            <TeamForm
              onSuccess={() => setShowCreate(false)}
              onCancel={() => setShowCreate(false)}
            />
          </Modal>
        )}

        {editingTeam && (
          <Modal isOpen onClose={() => setEditingTeam(null)} title={`Edit "${editingTeam.name}"`}>
            <TeamForm
              team={editingTeam}
              onSuccess={() => setEditingTeam(null)}
              onCancel={() => setEditingTeam(null)}
            />
          </Modal>
        )}
      </Box>
    </Box>
  )
}

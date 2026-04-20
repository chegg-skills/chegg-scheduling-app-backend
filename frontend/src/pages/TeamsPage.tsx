import Box from '@mui/material/Box'
import { useState } from 'react'
import { CalendarDays, Plus, ToggleRight, Users, UsersRound } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { useTeams } from '@/hooks/queries/useTeams'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { TeamTable } from '@/components/teams/TeamTable'
import { TeamForm } from '@/components/teams/TeamForm'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useTeamStats } from '@/hooks/queries/useStats'
import type { StatsTimeframe } from '@/types'
import { usePagination } from '@/hooks/usePagination'

export function TeamsPage() {
  const { user } = useAuth()
  const { pageSize, backendPage, onPageChange, onRowsPerPageChange } = usePagination(20)

  const [showCreate, setShowCreate] = useState(false)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('thisMonth')
  const canManageTeam = user?.role === 'SUPER_ADMIN'

  const { data, isLoading, error } = useTeams({
    page: backendPage,
    pageSize,
  })
  const { data: teamStats, isLoading: statsLoading } = useTeamStats(timeframe)

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
            <StatsOverview
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              timeframeInfo={teamStats?.timeframe}
              items={teamStatItems}
              isLoading={statsLoading}
            />

            <Box sx={{ mt: 3 }}>
              <TeamTable
                teams={teams}
                pagination={pagination}
                onPageChange={onPageChange}
                onRowsPerPageChange={onRowsPerPageChange}
                canManageTeam={canManageTeam}
              />
            </Box>
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
      </Box>
    </Box>
  )
}

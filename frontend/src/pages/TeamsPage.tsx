import Box from '@mui/material/Box'
import { useState } from 'react'
import { CalendarDays, Plus, ShieldCheck, Users, UsersRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useTeams } from '@/hooks/useTeams'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { Pagination } from '@/components/shared/Pagination'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { TeamTable } from '@/components/teams/TeamTable'
import { TeamForm } from '@/components/teams/TeamForm'
import { StatsOverview } from '@/components/shared/StatsOverview'
import { useTeamStats } from '@/hooks/useStats'
import type { StatsTimeframe } from '@/types'

const PAGE_SIZE = 20

export function TeamsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [timeframe, setTimeframe] = useState<StatsTimeframe>('month')
  const canManageTeam = user?.role === 'SUPER_ADMIN'

  const { data, isLoading, error } = useTeams({ page, pageSize: PAGE_SIZE })
  const { data: teamStats, isLoading: statsLoading } = useTeamStats(timeframe)

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load teams." />

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
      icon: <ShieldCheck size={18} />,
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
        subtitle={`${data?.pagination.total ?? 0} total teams`}
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
        <StatsOverview
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          timeframeInfo={teamStats?.timeframe}
          items={teamStatItems}
          isLoading={statsLoading}
        />

        <Box sx={{ mt: 3 }}>
          <TeamTable teams={data?.teams ?? []} canManageTeam={canManageTeam} />
        </Box>

        {data && data.pagination.totalPages > 1 && (
          <Box sx={{ mt: 2 }}>
            <Pagination
              page={page}
              totalPages={data.pagination.totalPages}
              total={data.pagination.total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </Box>
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

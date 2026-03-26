import Box from '@mui/material/Box'
import { useState } from 'react'
import { Plus } from 'lucide-react'
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

const PAGE_SIZE = 20

export function TeamsPage() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const canManageTeam = user?.role === 'SUPER_ADMIN'

  const { data, isLoading, error } = useTeams({ page, pageSize: PAGE_SIZE })

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load teams." />

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
          <TeamForm onSuccess={() => setShowCreate(false)} />
        </Modal>
      )}
    </Box>
  )
}

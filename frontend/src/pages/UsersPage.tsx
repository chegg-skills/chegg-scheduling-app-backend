import Box from '@mui/material/Box'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUsers } from '@/hooks/useUsers'
import type { UserRole } from '@/types'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { Pagination } from '@/components/shared/Pagination'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { UserTable } from '@/components/users/UserTable'
import { InviteForm } from '@/components/users/InviteForm'

const PAGE_SIZE = 20

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [page, setPage] = useState(1)
  const [showInvite, setShowInvite] = useState(false)

  const { data, isLoading, error } = useUsers({ page, pageSize: PAGE_SIZE })

  if (isLoading) return <PageSpinner />
  if (error) return <ErrorAlert message="Failed to load users." />

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle={`${data?.pagination.total ?? 0} total users`}
        actions={
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <UserPlus size={16} />
            Invite user
          </Button>
        }
      />

      <Box sx={{ mt: 3 }}>
        <UserTable
          users={data?.users ?? []}
          currentUserRole={(currentUser?.role ?? 'TEAM_ADMIN') as UserRole}
          currentUserId={currentUser?.id ?? ''}
        />
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

      <Modal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite user"
      >
        <InviteForm onSuccess={() => setShowInvite(false)} />
      </Modal>
    </Box>
  )
}

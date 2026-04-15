import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { SafeUser, UserRole, Pagination } from '@/types'
import { Modal } from '@/components/shared/Modal'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useDeactivateUser } from '@/hooks/useUsers'
import { useConfirm } from '@/context/ConfirmContext'
import { useTableSort } from '@/hooks/useTableSort'
import { UserDetailModal } from './UserDetailModal'
import { UserForm } from './UserForm'
import { UserTableRow } from './UserTableRow'
import { userSortAccessors, userTableColumns } from './userTableUtils'
import { TablePagination } from '@/components/shared/TablePagination'

interface UserTableProps {
  users: SafeUser[]
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (pageSize: number) => void
  currentUserRole: UserRole
  currentUserId: string
}

export function UserTable({
  users,
  pagination,
  onPageChange,
  onRowsPerPageChange,
  currentUserRole,
  currentUserId
}: UserTableProps) {
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const { mutate: deactivate } = useDeactivateUser()
  const { confirm } = useConfirm()
  const { sortedItems: sortedUsers, sortConfig, requestSort } = useTableSort(users, userSortAccessors)

  async function handleDeactivate(user: SafeUser) {
    const confirmed = await confirm({
      title: 'Deactivate user',
      message: `Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`,
    })

    if (confirmed) {
      deactivate(user.id)
    }
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {userTableColumns.map((column) => (
                <SortableHeaderCell
                  key={column.sortKey}
                  label={column.label}
                  sortKey={column.sortKey}
                  activeSortKey={sortConfig?.key ?? null}
                  direction={sortConfig?.direction ?? 'asc'}
                  onSort={requestSort}
                />
              ))}
              <TableCell
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    No users found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedUsers.map((user) => (
                <UserTableRow
                  key={user.id}
                  user={user}
                  onView={setViewingUserId}
                  onEdit={setEditingUser}
                  onDeactivate={handleDeactivate}
                  canDeactivate={user.isActive && user.id !== currentUserId}
                />
              ))
            )}
          </TableBody>
        </Table>
        {pagination && onPageChange && onRowsPerPageChange && (
          <TablePagination
            pagination={pagination}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
          />
        )}
      </TableContainer>

      {viewingUserId && <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}

      {editingUser && (
        <Modal
          isOpen
          size="lg"
          onClose={() => setEditingUser(null)}
          title={`Edit ${editingUser.firstName} ${editingUser.lastName}`}
        >
          <UserForm
            user={editingUser}
            currentUserRole={currentUserRole}
            onSuccess={() => setEditingUser(null)}
            onCancel={() => setEditingUser(null)}
          />
        </Modal>
      )}
    </>
  )
}

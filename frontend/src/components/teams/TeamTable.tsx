import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { Team, Pagination } from '@/types'
import { Modal } from '@/components/shared/Modal'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useDeleteTeam, useUpdateTeam } from '@/hooks/useTeams'
import { useTableSort } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { TeamForm } from './TeamForm'
import { TeamTableRow } from './TeamTableRow'
import { teamSortAccessors, teamTableColumns } from './teamTableUtils'
import { TablePagination } from '@/components/shared/TablePagination'

interface TeamTableProps {
  teams: Team[]
  pagination?: Pagination
  onPageChange: (page: number) => void
  onRowsPerPageChange: (pageSize: number) => void
  canManageTeam: boolean
}

export function TeamTable({
  teams,
  pagination,
  onPageChange,
  onRowsPerPageChange,
  canManageTeam,
}: TeamTableProps) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const { handleAction } = useAsyncAction()
  const {
    sortedItems: sortedTeams,
    sortConfig,
    requestSort,
  } = useTableSort(teams, teamSortAccessors)

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

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {teamTableColumns.map((column) => (
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
            {sortedTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    No teams found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedTeams.map((team) => (
                <TeamTableRow
                  key={team.id}
                  team={team}
                  canManageTeam={canManageTeam}
                  onEdit={setEditingTeam}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      </TableContainer>

      {editingTeam && (
        <Modal isOpen onClose={() => setEditingTeam(null)} title={`Edit "${editingTeam.name}"`}>
          <TeamForm
            team={editingTeam}
            onSuccess={() => setEditingTeam(null)}
            onCancel={() => setEditingTeam(null)}
          />
        </Modal>
      )}
    </>
  )
}

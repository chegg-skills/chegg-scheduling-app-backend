import { useState } from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { Team } from '@/types'
import { Modal } from '@/components/shared/Modal'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useDeleteTeam, useUpdateTeam } from '@/hooks/useTeams'
import { useConfirm } from '@/context/ConfirmContext'
import { useTableSort } from '@/hooks/useTableSort'
import { TeamForm } from './TeamForm'
import { TeamTableRow } from './TeamTableRow'
import { teamSortAccessors, teamTableColumns } from './teamTableUtils'

interface TeamTableProps {
  teams: Team[]
  canManageTeam: boolean
}

export function TeamTable({ teams, canManageTeam }: TeamTableProps) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const { confirm } = useConfirm()
  const { sortedItems: sortedTeams, sortConfig, requestSort } = useTableSort(teams, teamSortAccessors)

  async function handleToggleActive(team: Team) {
    const newStatus = !team.isActive

    const confirmed = await confirm({
      title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
      message: newStatus
        ? `Are you sure you want to mark team "${team.name}" as active? This will make it visible on the public booking page.`
        : `Are you sure you want to mark team "${team.name}" as inactive? This will hide it from the public booking page and prevent new bookings, but keep its configuration.`,
    })

    if (confirmed) {
      updateTeam({ teamId: team.id, data: { isActive: newStatus } })
    }
  }

  async function handleDelete(team: Team) {
    const confirmed = await confirm({
      title: 'Delete Team',
      message: `Are you sure you want to PERMANENTLY delete team "${team.name}"?\n\nThis action cannot be undone and will remove all associated events and memberships.`,
    })

    if (confirmed) {
      deleteTeam(team.id)
    }
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

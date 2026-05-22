import { useMemo } from 'react'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { Team, Pagination, SafeUser } from '@/types'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { useTableSort } from '@/hooks/useTableSort'
import { TeamTableRow } from './TeamTableRow'
import { getTeamSortAccessors, teamTableColumns } from './teamTableUtils'
import { TablePagination } from '@/components/shared/table/TablePagination'

interface TeamTableProps {
  teams: Team[]
  users: SafeUser[]
  pagination?: Pagination
  onPageChange: (page: number) => void
  onRowsPerPageChange: (pageSize: number) => void
  canManageTeam: boolean
  onEdit: (team: Team) => void
  onToggleActive: (team: Team) => void | Promise<void>
  onDelete: (team: Team) => void | Promise<void>
}

export function TeamTable({
  teams,
  users,
  pagination,
  onPageChange,
  onRowsPerPageChange,
  canManageTeam,
  onEdit,
  onToggleActive,
  onDelete,
}: TeamTableProps) {
  const sortAccessors = useMemo(() => getTeamSortAccessors(users), [users])
  const { sortedItems: sortedTeams, sortConfig, requestSort } = useTableSort(teams, sortAccessors)

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
                  width={column.width}
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
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
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
                  users={users}
                  canManageTeam={canManageTeam}
                  onEdit={onEdit}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
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
    </>
  )
}

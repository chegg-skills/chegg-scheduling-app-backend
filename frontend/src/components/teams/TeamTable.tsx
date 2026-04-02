import { useState } from 'react'
import Box from '@mui/material/Box'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Stack from '@mui/material/Stack'
import { Link as RouterLink } from 'react-router-dom'
import { Users, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import type { Team } from '@/types'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { TeamForm } from './TeamForm'
import { useDeleteTeam, useUpdateTeam } from '@/hooks/useTeams'
import { useConfirm } from '@/context/ConfirmContext'
import { RowActions } from '@/components/shared/RowActions'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'

interface TeamTableProps {
  teams: Team[]
  canManageTeam: boolean
}

type TeamSortKey = 'team' | 'description' | 'status'

const teamSortAccessors: SortAccessorMap<Team, TeamSortKey> = {
  team: (team) => team.name,
  description: (team) => team.description ?? '',
  status: (team) => team.isActive,
}

export function TeamTable({ teams, canManageTeam }: TeamTableProps) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const { mutate: deleteTeam } = useDeleteTeam()
  const { mutate: updateTeam } = useUpdateTeam()
  const { confirm } = useConfirm()
  const { sortedItems: sortedTeams, sortConfig, requestSort } = useTableSort(teams, teamSortAccessors)

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {[
                { label: 'Team', sortKey: 'team' as const },
                { label: 'Description', sortKey: 'description' as const },
                { label: 'Status', sortKey: 'status' as const },
              ].map((col) => (
                <SortableHeaderCell
                  key={col.sortKey}
                  label={col.label}
                  sortKey={col.sortKey}
                  activeSortKey={sortConfig?.key ?? null}
                  direction={sortConfig?.direction ?? 'asc'}
                  onSort={requestSort}
                />
              ))}
              <TableCell>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTeams.map((team) => (
              <TableRow key={team.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: 2,
                        bgcolor: 'secondary.light',
                        color: 'secondary.dark',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Users size={20} />
                    </Box>
                    <Link
                      component={RouterLink}
                      to={`/teams/${team.id}`}
                      sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        textDecoration: 'none',
                        '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                      }}
                    >
                      {team.name}
                    </Link>
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                  {team.description ?? 'No description provided'}
                </TableCell>
                <TableCell>
                  <Badge
                    label={team.isActive ? 'Active' : 'Inactive'}
                    variant={team.isActive ? 'green' : 'red'}
                  />
                </TableCell>
                <TableCell>
                  {canManageTeam && (
                    <RowActions
                      actions={[
                        {
                          label: 'Edit team details',
                          icon: <Edit size={16} />,
                          onClick: () => setEditingTeam(team),
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
                                  : `Are you sure you want to mark team "${team.name}" as inactive? This will hide it from the public booking page and prevent new bookings, but keep its configuration.`,
                              })
                            ) {
                              updateTeam({ teamId: team.id, data: { isActive: newStatus } })
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
                              deleteTeam(team.id)
                            }
                          },
                        },
                      ]}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editingTeam && (
        <Modal
          isOpen
          onClose={() => setEditingTeam(null)}
          title={`Edit "${editingTeam.name}"`}
        >
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

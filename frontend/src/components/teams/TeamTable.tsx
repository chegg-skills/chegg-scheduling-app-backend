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
import { Users, Edit, Trash2 } from 'lucide-react'
import type { Team } from '@/types'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { TeamForm } from './TeamForm'
import { useDeactivateTeam } from '@/hooks/useTeams'
import { useConfirm } from '@/context/ConfirmContext'
import { RowActions } from '@/components/shared/RowActions'

interface TeamTableProps {
  teams: Team[]
  canManageTeam: boolean
}

export function TeamTable({ teams, canManageTeam }: TeamTableProps) {
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const { mutate: deactivate } = useDeactivateTeam()
  const { confirm } = useConfirm()

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {['Team', 'Description', 'Status', 'Actions'].map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    letterSpacing: '0.05em',
                  }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {teams.map((team) => (
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
                          label: 'Edit',
                          icon: <Edit size={16} />,
                          onClick: () => setEditingTeam(team),
                        },
                        ...(team.isActive
                          ? [
                            {
                              label: 'Deactivate',
                              icon: <Trash2 size={16} />,
                              color: 'error.main',
                              onClick: async () => {
                                if (
                                  await confirm({
                                    title: 'Deactivate Team',
                                    message: `Are you sure you want to deactivate team "${team.name}"?`,
                                  })
                                ) {
                                  deactivate(team.id)
                                }
                              },
                            },
                          ]
                          : []),
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
          <TeamForm team={editingTeam} onSuccess={() => setEditingTeam(null)} />
        </Modal>
      )}
    </>
  )
}

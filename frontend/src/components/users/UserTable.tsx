import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Edit, Trash2 } from 'lucide-react'
import type { SafeUser, UserRole } from '@/types'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { UserForm } from './UserForm'
import { useDeactivateUser } from '@/hooks/useUsers'
import { useConfirm } from '@/context/ConfirmContext'
import { RowActions } from '@/components/shared/RowActions'

interface UserTableProps {
  users: SafeUser[]
  currentUserRole: UserRole
  currentUserId: string
}

function statusBadge(isActive: boolean) {
  return <Badge label={isActive ? 'Active' : 'Inactive'} variant={isActive ? 'green' : 'red'} />
}

function roleBadge(role: UserRole) {
  const variants: Record<UserRole, 'blue' | 'yellow' | 'gray'> = {
    SUPER_ADMIN: 'blue',
    TEAM_ADMIN: 'yellow',
    COACH: 'gray',
  }
  return <Badge label={role.replace('_', ' ')} variant={variants[role]} />
}

export function UserTable({ users, currentUserRole, currentUserId }: UserTableProps) {
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null)
  const { mutate: deactivate } = useDeactivateUser()
  const { confirm } = useConfirm()

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {['User', 'Role', 'Country', 'Timezone', 'Language', 'Status', 'Actions'].map((col) => (
                <TableCell
                  key={col}
                  sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: '0.05em' }}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar
                      src={user.avatarUrl ?? undefined}
                      sx={{
                        width: 36,
                        height: 36,
                        fontSize: '0.875rem',
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                        fontWeight: 600,
                      }}
                    >
                      {user.firstName[0]}{user.lastName[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>{roleBadge(user.role)}</TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>{user.country ?? '—'}</TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>{user.timezone.replace(/_/g, ' ')}</TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>{user.preferredLanguage ?? '—'}</TableCell>
                <TableCell>{statusBadge(user.isActive)}</TableCell>
                <TableCell>
                  <RowActions
                    actions={[
                      {
                        label: 'Edit',
                        icon: <Edit size={16} />,
                        onClick: () => setEditingUser(user),
                      },
                      ...(user.isActive && user.id !== currentUserId
                        ? [
                          {
                            label: 'Deactivate',
                            icon: <Trash2 size={16} />,
                            color: 'error.main',
                            onClick: async () => {
                              if (
                                await confirm({
                                  title: 'Deactivate User',
                                  message: `Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`,
                                })
                              ) {
                                deactivate(user.id)
                              }
                            },
                          },
                        ]
                        : []),
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          />
        </Modal>
      )}
    </>
  )
}

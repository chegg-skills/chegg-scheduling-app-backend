import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import { Trash2, Plus } from 'lucide-react'
import type { EventHost, TeamMember } from '@/types'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { useEventHosts, useSetEventHosts, useRemoveEventHost } from '@/hooks/useEvents'
import { extractApiError } from '@/utils/apiError'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { useConfirm } from '@/context/ConfirmContext'
import { RowActions } from '@/components/shared/RowActions'
import { AddHostForm } from './AddHostForm'

interface EventHostManagerProps {
  eventId: string
  hosts: EventHost[]
  teamMembers: TeamMember[]
  assignmentStrategy?: string
  title?: string
}

export function EventHostManager({ eventId, hosts, teamMembers, assignmentStrategy, title }: EventHostManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const { confirm } = useConfirm()

  const { data: hostsResponse } = useEventHosts(eventId)
  const { mutate: setHosts, isPending: setting, error: setError } = useSetEventHosts(eventId)
  const { mutate: removeHost, error: removeError } = useRemoveEventHost(eventId)

  const activeHosts = hostsResponse?.hosts ?? hosts

  const currentHostUserIds = new Set(activeHosts.map((h) => h.hostUserId))
  const eligibleCount = teamMembers.filter(
    (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentHostUserIds.has(m.userId),
  ).length

  function handleAdd(userIds: string[]) {
    const newHosts = [
      ...activeHosts.map((h, i) => ({ userId: h.hostUserId, hostOrder: h.hostOrder ?? i + 1 })),
      ...userIds.map((userId, i) => ({
        userId,
        hostOrder: activeHosts.length + i + 1,
      })),
    ]
    setHosts(
      { hosts: newHosts },
      {
        onSuccess: () => {
          setShowAddModal(false)
        },
      },
    )
  }

  const error = setError ?? removeError

  return (
    <Stack spacing={2}>
      {error && <ErrorAlert message={extractApiError(error)} />}

      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
        {title && <Typography variant="h6">{title} - {activeHosts.length}</Typography>}
        {eligibleCount > 0 && (
          <Button size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Add coach
          </Button>
        )}
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {['Coach', 'Country', 'Time Zone', 'Language', 'Actions'].map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'text.secondary'
                  }}
                  align={col === 'Actions' ? 'right' : 'left'}
                >
                  {col}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {activeHosts.length > 0 ? (
              activeHosts.map((host) => (
                <TableRow key={host.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: '0.875rem',
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          fontWeight: 600,
                        }}
                      >
                        {host.hostUser.firstName[0]}{host.hostUser.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {host.hostUser.firstName} {host.hostUser.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {host.hostUser.email}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{host.hostUser.country ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{host.hostUser.timezone.replace(/_/g, ' ')}</TableCell>
                  <TableCell sx={{ fontSize: '0.8125rem' }}>{host.hostUser.preferredLanguage ?? '—'}</TableCell>
                  <TableCell align="right">
                    <RowActions
                      actions={[
                        {
                          label: 'Remove',
                          icon: <Trash2 size={16} />,
                          color: 'error.main',
                          onClick: async () => {
                            if (
                              await confirm({
                                title: 'Remove Coach',
                                message: `Are you sure you want to remove ${host.hostUser.firstName} ${host.hostUser.lastName} as a host for this event?`,
                              })
                            ) {
                              removeHost(host.hostUserId)
                            }
                          },
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                  No hosts assigned yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add coach to event"
        size="sm"
      >
        <AddHostForm
          activeHosts={activeHosts}
          teamMembers={teamMembers}
          assignmentStrategy={assignmentStrategy}
          isPending={setting}
          onAdd={handleAdd}
          onCancel={() => setShowAddModal(false)}
        />
      </Modal>
    </Stack>
  )
}

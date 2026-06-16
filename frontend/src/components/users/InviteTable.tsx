import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import { Ban } from 'lucide-react'
import type { Pagination, UserInvite } from '@/types'
import { TablePagination } from '@/components/shared/table/TablePagination'
import { RowActions } from '@/components/shared/table/RowActions'
import { Badge } from '@/components/shared/ui/Badge'
import { InviteStatusBadge } from './InviteStatusBadge'
import { getUserRoleBadgeProps } from './userTableUtils'
import { useRevokeInvite } from '@/hooks/queries/useInvites'
import { useConfirm } from '@/context/confirm'
import { extractApiError } from '@/utils/apiError'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

interface InviteTableProps {
  invites: UserInvite[]
  pagination?: Pagination
  onPageChange: (page: number) => void
  onRowsPerPageChange: (pageSize: number) => void
}

export function InviteTable({
  invites,
  pagination,
  onPageChange,
  onRowsPerPageChange,
}: InviteTableProps) {
  const { mutate: revoke } = useRevokeInvite()
  const { confirm, alert } = useConfirm()

  function handleRevoke(invite: UserInvite) {
    confirm({
      title: 'Revoke invitation',
      message: `Revoke the invitation sent to ${invite.email}? They will no longer be able to use this link to create an account.`,
      confirmLabel: 'Revoke',
      onConfirm: () => {
        revoke(invite.id, {
          onError: (err) => alert({ title: 'Error', message: extractApiError(err) }),
        })
      },
    })
  }

  if (invites.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No invitations found.
        </Typography>
      </Box>
    )
  }

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Invited By</TableCell>
              <TableCell>Sent</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell>Accepted</TableCell>
              <TableCell>SSO</TableCell>
              <TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {invites.map((invite) => {
              const roleBadge = getUserRoleBadgeProps(invite.role)
              return (
                <TableRow key={invite.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {invite.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Badge label={roleBadge.label} color={roleBadge.color} variant="soft" />
                  </TableCell>
                  <TableCell>
                    <InviteStatusBadge status={invite.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {invite.createdByUser.firstName} {invite.createdByUser.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {invite.createdByUser.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {dateFormatter.format(new Date(invite.createdAt))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {dateTimeFormatter.format(new Date(invite.expiresAt))}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {invite.acceptedAt
                        ? dateFormatter.format(new Date(invite.acceptedAt))
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {invite.requiresSso ? (
                      <Badge label="SSO" color="blue" variant="soft" />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <RowActions
                      actions={[
                        {
                          label: 'Revoke',
                          icon: <Ban size={14} />,
                          color: 'error',
                          onClick: () => handleRevoke(invite),
                          disabled: invite.status !== 'PENDING',
                          tooltip:
                            invite.status !== 'PENDING'
                              ? `Cannot revoke a ${invite.status.toLowerCase()} invite`
                              : undefined,
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {pagination && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      )}
    </>
  )
}

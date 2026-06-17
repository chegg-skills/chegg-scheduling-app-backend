import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
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

const HEADER_SX = {
  fontSize: '0.75rem',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  letterSpacing: '0.05em',
}

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
      confirmText: 'Revoke',
      onConfirm: () => {
        revoke(invite.id, {
          onError: (err) => alert({ title: 'Error', message: extractApiError(err) }),
        })
      },
    })
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={HEADER_SX}>User Invited</TableCell>
            <TableCell sx={HEADER_SX}>Role</TableCell>
            <TableCell sx={HEADER_SX}>Status</TableCell>
            <TableCell sx={HEADER_SX}>Invited By</TableCell>
            <TableCell sx={HEADER_SX}>Sent</TableCell>
            <TableCell sx={HEADER_SX}>Expires</TableCell>
            <TableCell sx={HEADER_SX}>Accepted</TableCell>
            <TableCell sx={HEADER_SX}>SSO</TableCell>
            <TableCell sx={HEADER_SX} align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center" sx={{ py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  No invitations found.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            invites.map((invite) => {
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
                      {dateTimeFormatter.format(new Date(invite.createdAt))}
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
                        ? dateTimeFormatter.format(new Date(invite.acceptedAt))
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
            })
          )}
        </TableBody>
      </Table>
      {pagination && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      )}
    </TableContainer>
  )
}

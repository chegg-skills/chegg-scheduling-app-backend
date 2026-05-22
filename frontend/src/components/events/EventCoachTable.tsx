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
import { Trash2 } from 'lucide-react'
import type { EventCoach } from '@/types'
import { RowActions } from '@/components/shared/table/RowActions'
import { TablePagination } from '@/components/shared/table/TablePagination'
import { useAuth } from '@/context/auth'

interface EventCoachTableProps {
  coaches: EventCoach[]
  onRemove: (coachUserId: string, name: string) => void
  onViewUser?: (userId: string) => void
  canManage?: boolean
}

export function EventCoachTable({ coaches, onRemove, onViewUser, canManage = true }: EventCoachTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const { user: currentUser } = useAuth()
  const isCoach = currentUser?.role === 'COACH'

  const paginatedCoaches = coaches.slice((page - 1) * pageSize, page * pageSize)

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            {['Coach', 'Country', 'Time Zone', 'Language', ...(canManage ? ['Actions'] : [])].map((col) => (
              <TableCell
                key={col}
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                }}
                align={col === 'Actions' ? 'right' : 'left'}
              >
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {paginatedCoaches.length > 0 ? (
            paginatedCoaches.map((coach) => {
              const isSelf = coach.coachUser.id === currentUser?.id
              const canView = onViewUser && (!isCoach || isSelf)
              return (
                <TableRow key={coach.id} hover>
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
                        {coach.coachUser.firstName[0]}
                        {coach.coachUser.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography
                          variant="body2"
                          onClick={() => canView && onViewUser?.(coach.coachUser.id)}
                          sx={{
                            fontWeight: 600,
                            color: 'text.primary',
                            textDecoration: 'none',
                            cursor: canView ? 'pointer' : 'default',
                            '&:hover': {
                              color: canView ? 'primary.main' : 'inherit',
                              textDecoration: canView ? 'underline' : 'none',
                            },
                          }}
                        >
                          {coach.coachUser.firstName} {coach.coachUser.lastName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block' }}
                        >
                          {coach.coachUser.email}
                        </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>
                  {coach.coachUser.country ?? '—'}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>
                  {coach.coachUser.timezone?.replace(/_/g, ' ') ?? '—'}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>
                  {coach.coachUser.preferredLanguage ?? '—'}
                </TableCell>
                {canManage && (
                  <TableCell align="right">
                    <RowActions
                      actions={[
                        {
                          label: 'Remove',
                          icon: <Trash2 size={16} />,
                          color: 'error.main',
                          onClick: () =>
                            onRemove(
                              coach.coachUserId,
                              `${coach.coachUser.firstName} ${coach.coachUser.lastName}`
                            ),
                        },
                      ]}
                    />
                  </TableCell>
                )}
              </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={canManage ? 5 : 4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                No coaches assigned yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <TablePagination
        pagination={{
          page,
          pageSize,
          total: coaches.length,
          totalPages: Math.ceil(coaches.length / pageSize),
        }}
        onPageChange={setPage}
        onRowsPerPageChange={(newSize) => {
          setPageSize(newSize)
          setPage(1)
        }}
      />
    </TableContainer>
  )
}

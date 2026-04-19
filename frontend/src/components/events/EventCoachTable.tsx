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

interface EventCoachTableProps {
  coaches: EventCoach[]
  onRemove: (coachUserId: string, name: string) => void
  onViewUser?: (userId: string) => void
}

export function EventCoachTable({ coaches, onRemove, onViewUser }: EventCoachTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            {['Coach', 'Country', 'Time Zone', 'Language', 'Actions'].map((col) => (
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
          {coaches.length > 0 ? (
            coaches.map((coach) => (
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
                        onClick={() => onViewUser?.(coach.coachUser.id)}
                        sx={{
                          fontWeight: 600,
                          color: 'text.primary',
                          textDecoration: 'none',
                          cursor: onViewUser ? 'pointer' : 'default',
                          '&:hover': {
                            color: onViewUser ? 'primary.main' : 'inherit',
                            textDecoration: onViewUser ? 'underline' : 'none',
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
                <TableCell sx={{ fontSize: '0.8125rem' }}>{coach.coachUser.country ?? '—'}</TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>
                  {coach.coachUser.timezone.replace(/_/g, ' ')}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8125rem' }}>
                  {coach.coachUser.preferredLanguage ?? '—'}
                </TableCell>
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
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                No coaches assigned yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

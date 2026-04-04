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
import type { EventHost } from '@/types'
import { RowActions } from '@/components/shared/RowActions'

interface EventHostTableProps {
    hosts: EventHost[]
    onRemove: (hostUserId: string, name: string) => void
    onViewUser?: (userId: string) => void
}

export function EventHostTable({ hosts, onRemove, onViewUser }: EventHostTableProps) {
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
                    {hosts.length > 0 ? (
                        hosts.map((host) => (
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
                                            {host.hostUser.firstName[0]}
                                            {host.hostUser.lastName[0]}
                                        </Avatar>
                                        <Box>
                                            <Typography
                                                variant="body2"
                                                onClick={() => onViewUser?.(host.hostUser.id)}
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
                                                {host.hostUser.firstName} {host.hostUser.lastName}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                {host.hostUser.email}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8125rem' }}>{host.hostUser.country ?? '—'}</TableCell>
                                <TableCell sx={{ fontSize: '0.8125rem' }}>
                                    {host.hostUser.timezone.replace(/_/g, ' ')}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.8125rem' }}>
                                    {host.hostUser.preferredLanguage ?? '—'}
                                </TableCell>
                                <TableCell align="right">
                                    <RowActions
                                        actions={[
                                            {
                                                label: 'Remove',
                                                icon: <Trash2 size={16} />,
                                                color: 'error.main',
                                                onClick: () => onRemove(host.hostUserId, `${host.hostUser.firstName} ${host.hostUser.lastName}`),
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
    )
}

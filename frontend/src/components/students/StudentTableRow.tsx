import { TableRow, TableCell, Typography, Box, Avatar, alpha } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { toTitleCase } from '@/utils/toTitleCase'
import type { StudentSummary } from '@/types'

interface StudentTableRowProps {
    student: StudentSummary
}

export function StudentTableRow({ student }: StudentTableRowProps) {
    const theme = useTheme()

    return (
        <TableRow
            hover
            component={Link}
            to={`/students/${student.id}`}
            sx={{ textDecoration: 'none', cursor: 'pointer' }}
        >
            <TableCell sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                        sx={{
                            width: 40,
                            height: 40,
                            fontSize: '0.875rem',
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                        }}
                    >
                        {student.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" fontWeight={600}>
                        {toTitleCase(student.fullName)}
                    </Typography>
                </Box>
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {student.email}
                </Typography>
            </TableCell>
            <TableCell align="center">
                <Typography variant="body2" fontWeight={600}>
                    {student.bookingCount}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {student.firstBookedAt ? format(new Date(student.firstBookedAt), 'MMM d, yyyy') : 'N/A'}
                </Typography>
            </TableCell>
            <TableCell>
                <Typography variant="body2" color="text.secondary">
                    {student.lastBookedAt ? format(new Date(student.lastBookedAt), 'MMM d, yyyy') : 'N/A'}
                </Typography>
            </TableCell>
            <TableCell>
                {student.latestBooking ? (
                    <Box>
                        <Typography variant="body2" fontWeight={500}>
                            {toTitleCase(student.latestBooking.event.name)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {format(new Date(student.latestBooking.startTime), 'MMM d, yyyy')}
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        N/A
                    </Typography>
                )}
            </TableCell>
        </TableRow>
    )
}

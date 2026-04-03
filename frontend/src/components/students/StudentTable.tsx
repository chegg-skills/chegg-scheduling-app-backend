import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import type { StudentSummary } from '@/types'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useTableSort } from '@/hooks/useTableSort'
import { StudentTableRow } from './StudentTableRow'
import { studentSortAccessors, studentTableColumns } from './StudentTableUtils'

interface StudentTableProps {
    students: StudentSummary[]
}

export function StudentTable({ students }: StudentTableProps) {
    const { sortedItems: sortedStudents, sortConfig, requestSort } = useTableSort(students, studentSortAccessors)

    return (
        <TableContainer component={Paper} variant="outlined">
            <Table sx={{ minWidth: 650 }}>
                <TableHead>
                    <TableRow>
                        {studentTableColumns.map((column) => (
                            <SortableHeaderCell
                                key={column.sortKey}
                                label={column.label}
                                sortKey={column.sortKey}
                                activeSortKey={sortConfig?.key ?? null}
                                direction={sortConfig?.direction ?? 'asc'}
                                onSort={requestSort}
                            />
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {sortedStudents.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                                <Typography variant="body2" color="text.secondary">
                                    No students found.
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ) : (
                        sortedStudents.map((student) => (
                            <StudentTableRow
                                key={student.id}
                                student={student}
                            />
                        ))
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    )
}

import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TablePagination,
    TableRow,
    Typography,
} from '@mui/material'
import type { StudentSummary, Pagination } from '@/types'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { useTableSort } from '@/hooks/useTableSort'
import { StudentTableRow } from './StudentTableRow'
import { studentSortAccessors, studentTableColumns } from './StudentTableUtils'

interface StudentTableProps {
    students: StudentSummary[]
    pagination?: Pagination
    onPageChange?: (page: number) => void
    onRowsPerPageChange?: (rowsPerPage: number) => void
}

export function StudentTable({
    students,
    pagination,
    onPageChange,
    onRowsPerPageChange,
}: StudentTableProps) {
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
            {pagination && onPageChange && onRowsPerPageChange && (
                <TablePagination
                    component="div"
                    count={pagination.total}
                    page={pagination.page - 1}
                    onPageChange={(_, nextPage) => onPageChange(nextPage)}
                    rowsPerPage={pagination.pageSize}
                    onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
                    sx={{
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                    }}
                />
            )}
        </TableContainer>
    )
}

import { useState } from 'react'
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
import type { StudentSummary, Pagination } from '@/types'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { useTableSort } from '@/hooks/useTableSort'
import { StudentTableRow } from './StudentTableRow'
import { studentSortAccessors, studentTableColumns } from './StudentTableUtils'
import { TablePagination } from '@/components/shared/table/TablePagination'
import { SendEmailDialog } from './dialogs/SendEmailDialog'

interface StudentTableProps {
  students: StudentSummary[]
  pagination?: Pagination
  onPageChange?: (page: number) => void
  onRowsPerPageChange?: (pageSize: number) => void
}

export function StudentTable({
  students,
  pagination,
  onPageChange,
  onRowsPerPageChange,
}: StudentTableProps) {
  const [emailStudent, setEmailStudent] = useState<StudentSummary | null>(null)
  const {
    sortedItems: sortedStudents,
    sortConfig,
    requestSort,
  } = useTableSort(students, studentSortAccessors)

  return (
    <>
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
              <TableCell
                align="right"
                sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.875rem' }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                  <Typography variant="body2" color="text.secondary">
                    No students found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedStudents.map((student) => (
                <StudentTableRow key={student.id} student={student} onSendEmail={setEmailStudent} />
              ))
            )}
          </TableBody>
        </Table>
        {pagination && onPageChange && onRowsPerPageChange && (
          <TablePagination
            pagination={pagination}
            onPageChange={onPageChange}
            onRowsPerPageChange={onRowsPerPageChange}
          />
        )}
      </TableContainer>

      {emailStudent && (
        <SendEmailDialog
          open={!!emailStudent}
          onClose={() => setEmailStudent(null)}
          studentId={emailStudent.id}
          studentName={emailStudent.fullName}
          studentEmail={emailStudent.email}
        />
      )}
    </>
  )
}

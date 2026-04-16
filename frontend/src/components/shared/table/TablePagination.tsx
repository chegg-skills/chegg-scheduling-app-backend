import MuiTablePagination from '@mui/material/TablePagination'
import { Pagination } from '@/types'

interface TablePaginationProps {
  pagination?: Pagination
  onPageChange: (newPage: number) => void
  onRowsPerPageChange: (newSize: number) => void
}

/**
 * Shared TablePagination component for the admin dashboard.
 * Encapsulates MUI TablePagination and handles 1-indexed to 0-indexed conversion.
 */
export function TablePagination({
  pagination,
  onPageChange,
  onRowsPerPageChange,
}: TablePaginationProps) {
  if (!pagination) return null

  return (
    <MuiTablePagination
      component="div"
      count={pagination.total}
      page={pagination.page - 1} // MUI is 0-indexed, Backend is 1-indexed
      onPageChange={(_, nextPage) => onPageChange(nextPage)}
      rowsPerPage={pagination.pageSize}
      rowsPerPageOptions={[10, 20, 25, 50, 100]}
      onRowsPerPageChange={(e) => onRowsPerPageChange(parseInt(e.target.value, 10))}
      sx={{
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    />
  )
}

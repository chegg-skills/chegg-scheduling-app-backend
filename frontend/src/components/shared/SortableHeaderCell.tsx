import type { ReactNode } from 'react'
import Stack from '@mui/material/Stack'
import TableCell from '@mui/material/TableCell'
import TableSortLabel from '@mui/material/TableSortLabel'
import type { SxProps, Theme } from '@mui/material/styles'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import type { TableSortDirection } from '@/hooks/useTableSort'

interface SortableHeaderCellProps<K extends string> {
  label: ReactNode
  sortKey: K
  activeSortKey: K | null
  direction: TableSortDirection
  onSort: (key: K) => void
  tooltip?: string
  width?: string | number
  align?: 'inherit' | 'left' | 'center' | 'right' | 'justify'
  sx?: SxProps<Theme>
}

export function SortableHeaderCell<K extends string>({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
  tooltip,
  width,
  align = 'left',
  sx,
}: SortableHeaderCellProps<K>) {
  const isActive = activeSortKey === sortKey

  return (
    <TableCell
      align={align}
      sortDirection={isActive ? direction : false}
      sx={{
        width,
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center">
        <TableSortLabel
          active={isActive}
          direction={isActive ? direction : 'asc'}
          onClick={() => onSort(sortKey)}
        >
          {label}
        </TableSortLabel>
        {tooltip ? <InfoTooltip title={tooltip} /> : null}
      </Stack>
    </TableCell>
  )
}

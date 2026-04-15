import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import { Layers, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import type { EventOffering } from '@/types'
import { useDeleteEventOffering, useUpdateEventOffering } from '@/hooks/useEventOfferings'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { SortableHeaderCell } from '@/components/shared/SortableHeaderCell'
import { OfferingForm } from './OfferingForm'
import { RowActions } from '@/components/shared/RowActions'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { toTitleCase } from '@/utils/toTitleCase'

interface OfferingTableProps {
  offerings: EventOffering[]
}

const headerTooltips: Record<string, string> = {
  Offering: 'A category or type of service provided (e.g., Tutorial).',
  Key: 'A unique identifier used for URL paths and internal references.',
  Sort: 'The display order of this offering in lists.',
}

type OfferingSortKey = 'offering' | 'key' | 'sort' | 'status'

const offeringSortAccessors: SortAccessorMap<EventOffering, OfferingSortKey> = {
  offering: (offering) => offering.name,
  key: (offering) => offering.key,
  sort: (offering) => offering.sortOrder,
  status: (offering) => offering.isActive,
}

export function OfferingTable({ offerings }: OfferingTableProps) {
  const [editing, setEditing] = useState<EventOffering | null>(null)
  const { sortedItems: sortedOfferings, sortConfig, requestSort } = useTableSort(offerings, offeringSortAccessors)
  const { mutate: deleteOffering } = useDeleteEventOffering()
  const { mutate: updateOffering } = useUpdateEventOffering()
  const { handleAction } = useAsyncAction()

  const handleToggleActive = (offering: EventOffering) => {
    const newStatus = !offering.isActive
    handleAction(
      updateOffering,
      { offeringId: offering.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Mark as active' : 'Mark as inactive',
        message: newStatus
          ? `Are you sure you want to mark offering "${toTitleCase(offering.name)}" as active? This will make it available for new events.`
          : `Are you sure you want to mark offering "${toTitleCase(offering.name)}" as inactive? This will hide it from new selections but keep existing events linked.`,
        actionName: 'Update',
      }
    )
  }

  const handleDelete = (offering: EventOffering) => {
    handleAction(deleteOffering, offering.id, {
      title: 'Delete offering',
      message: `Are you sure you want to PERMANENTLY delete offering "${toTitleCase(offering.name)}"?\n\nThis action will only succeed if no events are currenty using this offering.`,
      actionName: 'Delete',
    })
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {[
                { label: 'Offering', sortKey: 'offering' as const, tooltip: headerTooltips.Offering },
                { label: 'Key', sortKey: 'key' as const, tooltip: headerTooltips.Key },
                { label: 'Sort', sortKey: 'sort' as const, tooltip: headerTooltips.Sort },
                { label: 'Status', sortKey: 'status' as const },
              ].map((col) => (
                <SortableHeaderCell
                  key={col.sortKey}
                  label={col.label}
                  sortKey={col.sortKey}
                  activeSortKey={sortConfig?.key ?? null}
                  direction={sortConfig?.direction ?? 'asc'}
                  onSort={requestSort}
                  tooltip={col.tooltip}
                />
              ))}
              <TableCell
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                  letterSpacing: '0.05em',
                }}
              >
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedOfferings.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1.5,
                        bgcolor: 'warning.light',
                        color: 'warning.dark',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Layers size={18} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {toTitleCase(o.name)}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 0.75, py: 0.25, borderRadius: 0.5 }}>
                    {o.key}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: '0.875rem' }}>{o.sortOrder}</TableCell>
                <TableCell>
                  <Badge label={o.isActive ? 'Active' : 'Inactive'} variant={o.isActive ? 'green' : 'red'} />
                </TableCell>
                <TableCell>
                  <RowActions
                    actions={[
                      {
                        label: 'Edit',
                        icon: <Edit size={16} />,
                        onClick: () => setEditing(o),
                      },
                      {
                        label: o.isActive ? 'Mark as inactive' : 'Mark as active',
                        icon: o.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                        onClick: () => handleToggleActive(o),
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 size={16} />,
                        color: 'error.main',
                        onClick: () => handleDelete(o),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={`Edit "${toTitleCase(editing.name)}"`}>
          <OfferingForm offering={editing} onSuccess={() => setEditing(null)} />
        </Modal>
      )}
    </>
  )
}

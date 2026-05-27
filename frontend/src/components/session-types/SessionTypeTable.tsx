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
import { Tag, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import type { SessionType } from '@/types'
import { useDeleteSessionType, useUpdateSessionType } from '@/hooks/queries/useSessionTypes'
import { Badge } from '@/components/shared/ui/Badge'
import { Modal } from '@/components/shared/ui/Modal'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { SessionTypeForm } from './SessionTypeForm'
import { RowActions } from '@/components/shared/table/RowActions'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { useAsyncAction } from '@/hooks/useAsyncAction'

interface SessionTypeTableProps {
  sessionTypes: SessionType[]
}

type SessionTypeSortKey = 'name' | 'slug' | 'sort' | 'status'

const sortAccessors: SortAccessorMap<SessionType, SessionTypeSortKey> = {
  name: (st) => st.name,
  slug: (st) => st.slug,
  sort: (st) => st.sortOrder,
  status: (st) => st.isActive,
}

export function SessionTypeTable({ sessionTypes }: SessionTypeTableProps) {
  const [editing, setEditing] = useState<SessionType | null>(null)
  const {
    sortedItems,
    sortConfig,
    requestSort,
  } = useTableSort(sessionTypes, sortAccessors)
  const { mutate: deleteSessionType } = useDeleteSessionType()
  const { mutate: updateSessionType } = useUpdateSessionType()
  const { handleAction } = useAsyncAction()

  const handleToggleActive = (st: SessionType) => {
    const newStatus = !st.isActive
    handleAction(
      updateSessionType,
      { sessionTypeId: st.id, data: { isActive: newStatus } },
      {
        title: newStatus ? 'Mark as active' : 'Mark as inactive',
        message: newStatus
          ? `Mark "${st.name}" as active? It will become discoverable on the public booking page.`
          : `Mark "${st.name}" as inactive? It will be hidden from the public booking page.`,
        actionName: 'Update',
      }
    )
  }

  const handleDelete = (st: SessionType) => {
    handleAction(deleteSessionType, st.id, {
      title: 'Delete session type',
      message: `Permanently delete "${st.name}"?\n\nThis will fail if any events are still linked to this session type.`,
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
                { label: 'Name', sortKey: 'name' as const },
                { label: 'Slug', sortKey: 'slug' as const },
                { label: 'Sort', sortKey: 'sort' as const },
                { label: 'Status', sortKey: 'status' as const },
              ].map((col) => (
                <SortableHeaderCell
                  key={col.sortKey}
                  label={col.label}
                  sortKey={col.sortKey}
                  activeSortKey={sortConfig?.key ?? null}
                  direction={sortConfig?.direction ?? 'asc'}
                  onSort={requestSort}
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
            {sortedItems.map((st) => (
              <TableRow key={st.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
                        borderRadius: 1.5,
                        bgcolor: 'primary.lighter',
                        color: 'primary.dark',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Tag size={18} />
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {st.name}
                      </Typography>
                      {st.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {st.description}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="caption"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: 0.5,
                    }}
                  >
                    {st.slug}
                  </Typography>
                </TableCell>
                <TableCell sx={{ fontSize: '0.875rem' }}>{st.sortOrder}</TableCell>
                <TableCell>
                  <Badge
                    label={st.isActive ? 'Active' : 'Inactive'}
                    color={st.isActive ? 'green' : 'red'}
                  />
                </TableCell>
                <TableCell>
                  <RowActions
                    actions={[
                      {
                        label: 'Edit',
                        icon: <Edit size={16} />,
                        onClick: () => setEditing(st),
                      },
                      {
                        label: st.isActive ? 'Mark as inactive' : 'Mark as active',
                        icon: st.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                        onClick: () => handleToggleActive(st),
                      },
                      {
                        label: 'Delete',
                        icon: <Trash2 size={16} />,
                        color: 'error.main',
                        onClick: () => handleDelete(st),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
            {sortedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                  No session types yet. Create one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={`Edit "${editing.name}"`}>
          <SessionTypeForm sessionType={editing} onSuccess={() => setEditing(null)} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </>
  )
}

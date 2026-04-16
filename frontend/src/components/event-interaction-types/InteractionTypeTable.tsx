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
import { Monitor, Edit, Trash2, Info } from 'lucide-react'
import type { EventInteractionType } from '@/types'
import { Badge } from '@/components/shared/ui/Badge'
import { Modal } from '@/components/shared/ui/Modal'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { InteractionTypeForm } from './InteractionTypeForm'
import { RowActions } from '@/components/shared/table/RowActions'
import { Button } from '@/components/shared/ui/Button'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'
import { useConfirm } from '@/context/confirm'
import { useDeleteInteractionType } from '@/hooks/queries/useInteractionTypes'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { extractApiError } from '@/utils/apiError'
import { InteractionTypeUsageList } from './InteractionTypeUsageList'
import { toTitleCase } from '@/utils/toTitleCase'

interface InteractionTypeTableProps {
  interactionTypes: EventInteractionType[]
}

const headerTooltips: Record<string, string> = {
  'Interaction Type': 'The method of communication (e.g., Zoom, Google Meet).',
  'Multi-Host': 'Allows multiple hosts to be assigned to the same event.',
  'Round Robin': 'Automatically cycles through hosts to distribute events evenly.',
  Sort: 'The display order of this interaction type in lists.',
}

type InteractionTypeSortKey = 'interactionType' | 'multiHost' | 'roundRobin' | 'sort' | 'status'

const interactionTypeSortAccessors: SortAccessorMap<EventInteractionType, InteractionTypeSortKey> =
  {
    interactionType: (interactionType) => interactionType.name,
    multiHost: (interactionType) => interactionType.supportsMultipleHosts,
    roundRobin: (interactionType) => interactionType.supportsRoundRobin,
    sort: (interactionType) => interactionType.sortOrder,
    status: (interactionType) => interactionType.isActive,
  }

export function InteractionTypeTable({ interactionTypes }: InteractionTypeTableProps) {
  const [editing, setEditing] = useState<EventInteractionType | null>(null)
  const [usageId, setUsageId] = useState<string | null>(null)
  const {
    sortedItems: sortedInteractionTypes,
    sortConfig,
    requestSort,
  } = useTableSort(interactionTypes, interactionTypeSortAccessors)
  const { alert } = useConfirm()
  const { mutate: deleteInteractionType } = useDeleteInteractionType()
  const { handleAction } = useAsyncAction()

  const usageTarget = usageId ? interactionTypes.find((t) => t.id === usageId) : null

  const handleDelete = async (t: EventInteractionType) => {
    handleAction(deleteInteractionType, t.id, {
      title: 'Delete interaction type',
      message: `Are you sure you want to permanently delete "${toTitleCase(t.name)}"? This action cannot be undone.`,
      confirmText: 'Yes',
      actionName: 'Delete',
      onError: (error: any) => {
        if (error.response?.status === 409) {
          setUsageId(t.id)
        } else {
          alert({
            title: 'Delete Failed',
            message: extractApiError(error),
          })
        }
      },
    })
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {[
                {
                  label: 'Interaction Type',
                  sortKey: 'interactionType' as const,
                  tooltip: headerTooltips['Interaction Type'],
                },
                {
                  label: 'Multi-host',
                  sortKey: 'multiHost' as const,
                  tooltip: headerTooltips['Multi-Host'],
                },
                {
                  label: 'Round-robin',
                  sortKey: 'roundRobin' as const,
                  tooltip: headerTooltips['Round Robin'],
                },
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
            {interactionTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <Typography variant="body2" color="text.secondary">
                    No interaction types found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              sortedInteractionTypes.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1.5,
                          bgcolor: 'secondary.light',
                          color: 'secondary.dark',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Monitor size={18} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {toTitleCase(t.name)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                        >
                          {t.key}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={t.supportsMultipleHosts ? 'Yes' : 'No'}
                      variant={t.supportsMultipleHosts ? 'green' : 'gray'}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge
                      label={t.supportsRoundRobin ? 'Yes' : 'No'}
                      variant={t.supportsRoundRobin ? 'green' : 'gray'}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{t.sortOrder}</TableCell>
                  <TableCell>
                    <Badge
                      label={t.isActive ? 'Active' : 'Inactive'}
                      variant={t.isActive ? 'green' : 'red'}
                    />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      actions={[
                        {
                          label: 'Edit',
                          icon: <Edit size={16} />,
                          onClick: () => setEditing(t),
                        },
                        {
                          label: 'View usage',
                          icon: <Info size={16} />,
                          onClick: () => setUsageId(t.id),
                        },
                        {
                          label: 'Delete',
                          icon: <Trash2 size={16} />,
                          onClick: () => handleDelete(t),
                          color: 'error',
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editing && (
        <Modal
          isOpen
          size="lg"
          onClose={() => setEditing(null)}
          title={`Edit "${toTitleCase(editing.name)}"`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)} sx={{ minWidth: 120 }}>
                Cancel
              </Button>
              <Button type="submit" form="interaction-type-form" sx={{ minWidth: 160, ml: 2 }}>
                Save changes
              </Button>
            </>
          }
        >
          <InteractionTypeForm
            interactionType={editing}
            onSuccess={() => setEditing(null)}
            formId="interaction-type-form"
          />
        </Modal>
      )}

      {usageTarget && (
        <Modal
          isOpen
          size="md"
          onClose={() => setUsageId(null)}
          title={`Usage: ${toTitleCase(usageTarget.name)}`}
          footer={
            <Button variant="secondary" onClick={() => setUsageId(null)}>
              Close
            </Button>
          }
        >
          <Box sx={{ p: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              This interaction type is currently used by the following events. To delete it, you
              must first change the interaction type for these events or deactivate this interaction
              type.
            </Typography>

            <InteractionTypeUsageList interactionTypeId={usageTarget.id} />

            <Box sx={{ mt: 3, p: 2, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                💡 Recommendation: Deactivate
              </Typography>
              <Typography variant="body2" color="text.secondary">
                If you no longer want to offer this interaction type, uncheck{' '}
                <strong>"Is active"</strong> in the Edit form. This prevents new events from using
                it while keeping historical data intact.
              </Typography>
            </Box>
          </Box>
        </Modal>
      )}
    </>
  )
}

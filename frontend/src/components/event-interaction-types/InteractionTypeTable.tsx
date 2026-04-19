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
import { Monitor } from 'lucide-react'
import type { InteractionTypeInfo } from '@/types'
import { Badge } from '@/components/shared/ui/Badge'
import { SortableHeaderCell } from '@/components/shared/table/SortableHeaderCell'
import { useTableSort, type SortAccessorMap } from '@/hooks/useTableSort'

interface InteractionTypeTableProps {
  interactionTypes: InteractionTypeInfo[]
}

const headerTooltips: Record<string, string> = {
  'Interaction Type': 'The method of communication (e.g., Zoom, Google Meet).',
  'Multi-Coach': 'Allows multiple coaches to be assigned to the same event.',
  'Multi-Student': 'Allows multiple students to book the same session.',
}

type InteractionTypeSortKey = 'interactionType' | 'multiCoach' | 'multiStudent'

const interactionTypeSortAccessors: SortAccessorMap<InteractionTypeInfo, InteractionTypeSortKey> =
{
  interactionType: (info) => info.label,
  multiCoach: (info) => info.caps.multipleCoaches,
  multiStudent: (info) => info.caps.multipleParticipants,
}

export function InteractionTypeTable({ interactionTypes }: InteractionTypeTableProps) {
  const {
    sortedItems: sortedInteractionTypes,
    sortConfig,
    requestSort,
  } = useTableSort(interactionTypes, interactionTypeSortAccessors)

  return (
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
                label: 'Multi-coach',
                sortKey: 'multiCoach' as const,
                tooltip: headerTooltips['Multi-Coach'],
              },
              {
                label: 'Multi-student',
                sortKey: 'multiStudent' as const,
                tooltip: headerTooltips['Multi-Student'],
              },
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
          </TableRow>
        </TableHead>
        <TableBody>
          {interactionTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} align="center" sx={{ py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  No interaction types found.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            sortedInteractionTypes.map((t) => (
              <TableRow key={t.key} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        flexShrink: 0,
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
                        {t.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          bgcolor: 'grey.100',
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.5,
                          color: 'text.secondary',
                          display: 'inline-block',
                          mt: 0.5,
                        }}
                      >
                        {t.key}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Badge
                    label={t.caps.multipleCoaches ? 'Yes' : 'No'}
                    variant={t.caps.multipleCoaches ? 'green' : 'gray'}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    label={t.caps.multipleParticipants ? 'Yes' : 'No'}
                    variant={t.caps.multipleParticipants ? 'green' : 'gray'}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

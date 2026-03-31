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
import { Layers, Edit } from 'lucide-react'
import type { EventOffering } from '@/types'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { OfferingForm } from './OfferingForm'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { RowActions } from '@/components/shared/RowActions'

interface OfferingTableProps {
  offerings: EventOffering[]
}

const headerTooltips: Record<string, string> = {
  Offering: 'A category or type of service provided (e.g., Tutorial).',
  Key: 'A unique identifier used for URL paths and internal references.',
  Sort: 'The display order of this offering in lists.',
}

export function OfferingTable({ offerings }: OfferingTableProps) {
  const [editing, setEditing] = useState<EventOffering | null>(null)

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {['Offering', 'Key', 'Sort', 'Status', 'Actions'].map((col) => (
                <TableCell
                  key={col}
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    letterSpacing: '0.05em',
                  }}
                >
                  <Stack direction="row" alignItems="center">
                    {col}
                    {headerTooltips[col] && <InfoTooltip title={headerTooltips[col]} />}
                  </Stack>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {offerings.map((o) => (
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
                      {o.name}
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
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {editing && (
        <Modal isOpen onClose={() => setEditing(null)} title={`Edit "${editing.name}"`}>
          <OfferingForm offering={editing} onSuccess={() => setEditing(null)} />
        </Modal>
      )}
    </>
  )
}

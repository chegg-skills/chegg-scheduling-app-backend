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
import { Monitor, Edit } from 'lucide-react'
import type { EventInteractionType } from '@/types'
import { Badge } from '@/components/shared/Badge'
import { Modal } from '@/components/shared/Modal'
import { InteractionTypeForm } from './InteractionTypeForm'
import { InfoTooltip } from '@/components/shared/InfoTooltip'
import { RowActions } from '@/components/shared/RowActions'
import { Button } from '@/components/shared/Button'

interface InteractionTypeTableProps {
  interactionTypes: EventInteractionType[]
}

const headerTooltips: Record<string, string> = {
  'Interaction Type': 'The method of communication (e.g., Zoom, Google Meet).',
  'Multi-Host': 'Allows multiple hosts to be assigned to the same event.',
  'Round Robin': 'Automatically cycles through hosts to distribute events evenly.',
  Sort: 'The display order of this interaction type in lists.',
}

export function InteractionTypeTable({ interactionTypes }: InteractionTypeTableProps) {
  const [editing, setEditing] = useState<EventInteractionType | null>(null)

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {['Interaction Type', 'Multi-Host', 'Round Robin', 'Sort', 'Status', 'Actions'].map(
                (col) => (
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
                ),
              )}
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
              interactionTypes.map((t) => (
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
                          {t.name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                          {t.key}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Badge label={t.supportsMultipleHosts ? 'Yes' : 'No'} variant={t.supportsMultipleHosts ? 'green' : 'gray'} />
                  </TableCell>
                  <TableCell>
                    <Badge label={t.supportsRoundRobin ? 'Yes' : 'No'} variant={t.supportsRoundRobin ? 'green' : 'gray'} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{t.sortOrder}</TableCell>
                  <TableCell>
                    <Badge label={t.isActive ? 'Active' : 'Inactive'} variant={t.isActive ? 'green' : 'red'} />
                  </TableCell>
                  <TableCell>
                    <RowActions
                      actions={[
                        {
                          label: 'Edit',
                          icon: <Edit size={16} />,
                          onClick: () => setEditing(t),
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
          title={`Edit "${editing.name}"`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)} sx={{ minWidth: 120 }}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="interaction-type-form"
                sx={{ minWidth: 160, ml: 2 }}
              >
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
    </>
  )
}

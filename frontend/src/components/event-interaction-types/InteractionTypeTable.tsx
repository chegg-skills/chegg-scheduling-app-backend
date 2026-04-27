import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import type { InteractionTypeInfo } from '@/types'
import { Badge } from '@/components/shared/ui/Badge'

interface InteractionTypeTableProps {
  interactionTypes: InteractionTypeInfo[]
}

export function InteractionTypeTable({ interactionTypes }: InteractionTypeTableProps) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            {['Interaction Type', 'Multiple Coaches', 'Multiple Participants', 'Leadership Derived'].map(
              (label) => (
                <TableCell
                  key={label}
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    letterSpacing: '0.05em',
                  }}
                >
                  {label}
                </TableCell>
              )
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {interactionTypes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                <Typography variant="body2" color="text.secondary">
                  No interaction types found.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            interactionTypes.map((t) => (
              <TableRow key={t.key} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {t.label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'monospace', color: 'text.secondary' }}
                  >
                    {t.key}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Badge
                    label={t.caps.multipleCoaches ? 'Yes' : 'No'}
                    color={t.caps.multipleCoaches ? 'green' : 'gray'}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    label={t.caps.multipleParticipants ? 'Yes' : 'No'}
                    color={t.caps.multipleParticipants ? 'green' : 'gray'}
                  />
                </TableCell>
                <TableCell>
                  <Badge
                    label={t.caps.derivesLeadershipFromAssignment ? 'Yes' : 'No'}
                    color={t.caps.derivesLeadershipFromAssignment ? 'green' : 'gray'}
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

import React from 'react'
import { format } from 'date-fns'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { RefreshCw, Calendar, ChevronRight, MoreVertical, ListFilter } from 'lucide-react'
import { Stack, Typography, IconButton } from '@mui/material'
import { RowActions } from '@/components/shared/table/RowActions'
import type { EventScheduleSlot } from '@/types'

export interface ScheduleSeriesGroup {
  id: string
  startTime: string
  endTime: string
  isRecurring: boolean
  occurrenceCount: number
  slots: EventScheduleSlot[]
}

interface Props {
  groups: ScheduleSeriesGroup[]
  onViewTracker: (group: ScheduleSeriesGroup) => void
  onRemoveSeries: (group: ScheduleSeriesGroup) => void
}

export function ScheduleSeriesTable({ groups, onViewTracker, onRemoveSeries }: Props) {
  if (groups.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 8, textAlign: 'center', borderRadius: 1, borderStyle: 'dashed' }}>
        <Typography color="text.secondary">No sessions scheduled yet.</Typography>
      </Paper>
    )
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
      <Table>
        <TableHead sx={{ bgcolor: 'action.hover' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Session Series / Template</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Next Instance</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Occurrences</TableCell>
            <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((group) => {
            const dateStr = format(new Date(group.startTime), 'EEE, MMM d')
            const timeRange = `${format(new Date(group.startTime), 'h:mm a')} - ${format(new Date(group.endTime), 'h:mm a')}`

            return (
              <TableRow key={group.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: group.isRecurring ? 'primary.lighter' : 'grey.100',
                      color: group.isRecurring ? 'primary.main' : 'text.secondary'
                    }}>
                      {group.isRecurring ? <RefreshCw size={18} /> : <Calendar size={18} />}
                    </Box>
                    <Box>
                        <Typography variant="body2" fontWeight={600}>
                            {group.isRecurring ? 'Recurring Weekly Series' : 'Individual Session'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {group.isRecurring ? 'Multiple dates' : 'One-time session'}
                        </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{dateStr}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{timeRange}</Typography>
                </TableCell>
                <TableCell>
                   <Box sx={{ 
                      display: 'inline-flex', 
                      px: 1, 
                      py: 0.25, 
                      borderRadius: 0.5, 
                      bgcolor: 'action.hover',
                      fontSize: '0.75rem',
                      fontWeight: 700
                   }}>
                      {group.occurrenceCount}
                   </Box>
                </TableCell>
                <TableCell align="right">
                   <RowActions
                    actions={[
                      {
                        label: 'View Tracker',
                        icon: <ListFilter size={16} />,
                        onClick: () => onViewTracker(group),
                      },
                      {
                        label: 'Delete Entire Series',
                        icon: <MoreVertical size={16} />,
                        color: 'error.main',
                        onClick: () => onRemoveSeries(group),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

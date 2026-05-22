import { useState } from 'react'
import Box from '@mui/material/Box'
import Collapse from '@mui/material/Collapse'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/shared/ui/Badge'
import { EventTable } from '../table/EventTable'
import type { Event, EventGroup } from '@/types'

interface EventGroupSectionProps {
  group: EventGroup | null
  events: Event[]
  teamId: string
  onViewUser?: (userId: string) => void
  onEditGroup?: (group: EventGroup) => void
  onDeleteGroup?: (group: EventGroup) => void
  defaultExpanded?: boolean
  canManage?: boolean
}

export function EventGroupSection({
  group,
  events,
  teamId,
  onViewUser,
  onEditGroup,
  onDeleteGroup,
  defaultExpanded = true,
  canManage,
}: EventGroupSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const isUngrouped = group === null
  const title = isUngrouped ? 'Ungrouped' : group.name
  const color = isUngrouped ? null : group.color

  return (
    <Paper variant="outlined" sx={{ mb: 2, overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{
          p: 1.5,
          cursor: 'pointer',
          backgroundColor: 'grey.50',
          '&:hover': { backgroundColor: 'grey.100' },
        }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <IconButton size="small" aria-label={expanded ? 'Collapse group' : 'Expand group'}>
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </IconButton>

        {color && (
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: color,
              flexShrink: 0,
            }}
          />
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>

        <Badge label={`${events.length}`} color="gray" />

        {!isUngrouped && group.description && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              ml: 1,
              fontStyle: 'italic',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            noWrap
          >
            {group.description}
          </Typography>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {!isUngrouped && canManage && (
          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
            {onEditGroup && (
              <Tooltip title="Rename group">
                <IconButton size="small" onClick={() => onEditGroup(group)}>
                  <Edit size={16} />
                </IconButton>
              </Tooltip>
            )}
            {onDeleteGroup && (
              <Tooltip title="Delete group">
                <IconButton size="small" onClick={() => onDeleteGroup(group)}>
                  <Trash2 size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Stack>

      <Collapse in={expanded}>
        <Box sx={{ p: 1.5 }}>
          <EventTable events={events} teamId={teamId} onViewUser={onViewUser} />
        </Box>
      </Collapse>
    </Paper>
  )
}

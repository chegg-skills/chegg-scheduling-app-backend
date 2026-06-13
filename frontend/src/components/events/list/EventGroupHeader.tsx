import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { EventGroup } from '@/types'
import { PublicBookingLinkCell } from '@/components/shared/PublicBookingLinkCell'

export interface GroupEntry {
  id: string
  name: string
  color: string | null
  events: unknown[]
}

const GROUP_LABEL_SX = {
  fontWeight: 800,
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
  letterSpacing: '0.1em',
  fontSize: '0.75rem',
}

interface EventGroupHeaderProps {
  group: GroupEntry
  groups: EventGroup[]
}

export function EventGroupHeader({ group, groups }: EventGroupHeaderProps) {
  const color = group.color ?? '#E87100'
  const rawGroup = groups.find((g) => g.id === group.id)
  const groupBookingSlug = rawGroup?.publicBookingSlug

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ pl: 0.5 }}>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 8px ${alpha(color, 0.5)}`,
        }}
      />
      <Typography variant="caption" sx={GROUP_LABEL_SX}>
        {group.name}
      </Typography>
      <Box
        sx={{
          fontSize: '0.725rem',
          fontWeight: 700,
          px: 1,
          py: 0.2,
          borderRadius: '12px',
          backgroundColor: alpha(color, 0.08),
          color,
        }}
      >
        {group.events.length}
      </Box>
      {group.id !== 'ungrouped' && group.id !== 'all' && groupBookingSlug && (
        <PublicBookingLinkCell type="group" slug={groupBookingSlug} isActive={true} />
      )}
      <Box
        sx={{
          flexGrow: 1,
          height: '1px',
          background: (theme) =>
            `linear-gradient(to right, ${alpha(theme.palette.divider, 0.8)}, transparent)`,
          ml: 2,
        }}
      />
    </Stack>
  )
}

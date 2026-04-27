import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Calendar } from 'lucide-react'
import type { UserWithDetails } from '@/types'
import { Badge } from '@/components/shared/ui/Badge'
import { toTitleCase } from '@/utils/toTitleCase'

interface UserCoachedEventsTabProps {
  user: UserWithDetails
}

export function UserCoachedEventsTab({ user }: UserCoachedEventsTabProps) {
  if (user.coachedEvents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Calendar size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
        <Typography color="text.secondary" fontWeight={500}>
          This user is not coaching any events.
        </Typography>
      </Box>
    )
  }

  return (
    <List disablePadding>
      {user.coachedEvents.map((coach) => (
        <ListItem
          key={coach.id}
          divider
          sx={{
            borderRadius: 1,
            mb: 1,
            '&:last-child': { borderBottom: 0 },
          }}
        >
          <ListItemText
            primary={
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>
                  {toTitleCase(coach.event.name)}
                </Typography>
                <Badge label={toTitleCase(coach.event.offering.name)} color="blue" />
              </Stack>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {formatEnumLabel(coach.event.interactionType)} •{' '}
                {Math.round(coach.event.durationSeconds / 60)} mins
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  )
}

function formatEnumLabel(val: string) {
  if (!val) return ''
  return val
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(' ')
}

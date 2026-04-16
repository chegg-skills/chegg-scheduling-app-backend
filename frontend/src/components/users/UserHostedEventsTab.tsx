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

interface UserHostedEventsTabProps {
  user: UserWithDetails
}

export function UserHostedEventsTab({ user }: UserHostedEventsTabProps) {
  if (user.hostedEvents.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Calendar size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
        <Typography color="text.secondary" fontWeight={500}>
          This user is not hosting any events.
        </Typography>
      </Box>
    )
  }

  return (
    <List disablePadding>
      {user.hostedEvents.map((host) => (
        <ListItem
          key={host.id}
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
                  {toTitleCase(host.event.name)}
                </Typography>
                <Badge label={toTitleCase(host.event.offering.name)} variant="blue" />
              </Stack>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {toTitleCase(host.event.interactionType.name)} •{' '}
                {Math.round(host.event.durationSeconds / 60)} mins
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  )
}

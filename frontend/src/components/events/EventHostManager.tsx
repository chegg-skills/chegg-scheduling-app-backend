import { useState } from 'react'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { EventHost, TeamMember } from '@/types'
import { Button } from '@/components/shared/Button'
import { Select } from '@/components/shared/Select'
import { useEventHosts, useSetEventHosts, useRemoveEventHost } from '@/hooks/useEvents'
import { extractApiError } from '@/utils/apiError'
import { ErrorAlert } from '@/components/shared/ErrorAlert'

interface EventHostManagerProps {
  eventId: string
  hosts: EventHost[]
  teamMembers: TeamMember[]
}

export function EventHostManager({ eventId, hosts, teamMembers }: EventHostManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const { data: hostsResponse } = useEventHosts(eventId)
  const { mutate: setHosts, isPending: setting, error: setError } = useSetEventHosts(eventId)
  const { mutate: removeHost, error: removeError } = useRemoveEventHost(eventId)

  const activeHosts = hostsResponse?.hosts ?? hosts

  const currentHostUserIds = new Set(activeHosts.map((h) => h.hostUserId))
  const eligible = teamMembers.filter(
    (m) => m.isActive && m.user.role !== 'SUPER_ADMIN' && !currentHostUserIds.has(m.userId),
  )

  function handleAdd() {
    if (!selectedUserId) return
    const newHosts = [
      ...activeHosts.map((h, i) => ({ userId: h.hostUserId, hostOrder: i + 1 })),
      { userId: selectedUserId, hostOrder: activeHosts.length + 1 },
    ]
    setHosts({ hosts: newHosts }, { onSuccess: () => setSelectedUserId('') })
  }

  const error = setError ?? removeError

  return (
    <Stack spacing={2}>
      {error && <ErrorAlert message={extractApiError(error)} />}

      {activeHosts.length > 0 ? (
        <Paper variant="outlined">
          <List disablePadding>
            {activeHosts.map((host) => (
              <ListItem key={host.id} divider secondaryAction={
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeHost(host.hostUserId)}
                >
                  Remove
                </Button>
              }>
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {host.hostUser.firstName} {host.hostUser.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Order: {host.hostOrder}</Typography>
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : (
        <Typography variant="body2" color="text.secondary">No hosts assigned yet.</Typography>
      )}

      {eligible.length > 0 && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
          <Box sx={{ flex: 1 }}>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value as string)}
            >
              <MenuItem value="">Add a host…</MenuItem>
              {eligible.map(({ user }) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <Button
            variant="secondary"
            onClick={handleAdd}
            isLoading={setting}
            disabled={!selectedUserId}
          >
            Add
          </Button>
        </Stack>
      )}
    </Stack>
  )
}

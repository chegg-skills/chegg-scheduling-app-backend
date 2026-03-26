import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useEvent, useDeactivateEvent } from '@/hooks/useEvents'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Badge } from '@/components/shared/Badge'
import { EventForm } from '@/components/events/EventForm'
import { EventHostManager } from '@/components/events/EventHostManager'

export function EventDetailPage() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const [showEdit, setShowEdit] = useState(false)

  const { data: event, isLoading, error } = useEvent(eventId)
  const { data: teamMembersResponse } = useTeamMembers(event?.teamId ?? '')
  const deactivateEvent = useDeactivateEvent()

  const teamMembers = teamMembersResponse?.members ?? []

  if (isLoading) return <PageSpinner />
  if (error || !event) return <ErrorAlert message="Failed to load event." />

  return (
    <Stack spacing={4}>
      <Box>
        <Link component={RouterLink} to={`/teams/${event.teamId}`} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
          <ChevronLeft size={16} /> Back to team
        </Link>
        <PageHeader
          title={event.name}
          subtitle={event.description ?? undefined}
          actions={
            <Stack direction="row" spacing={1}>
              <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
                Edit event
              </Button>
              {event.isActive && (
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={deactivateEvent.isPending}
                  onClick={() => deactivateEvent.mutate(eventId)}
                >
                  Deactivate
                </Button>
              )}
            </Stack>
          }
        />
        <Badge
          label={event.isActive ? 'Active' : 'Inactive'}
          variant={event.isActive ? 'green' : 'red'}
        />
      </Box>

      <Paper component="section" variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 2 }}>
          Details
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Location type</Typography>
            <Typography variant="body2">{event.locationType}</Typography>
          </Grid>
          {event.locationValue && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">Location</Typography>
              <Typography variant="body2">{event.locationValue}</Typography>
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Duration</Typography>
            <Typography variant="body2">{event.durationSeconds / 60} min</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">Assignment strategy</Typography>
            <Typography variant="body2">{event.assignmentStrategy}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box component="section">
        <Typography variant="h6" mb={2}>Hosts</Typography>
        <EventHostManager
          eventId={eventId}
          hosts={event.hosts}
          teamMembers={teamMembers}
        />
      </Box>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit event" size="lg">
        <EventForm event={event} teamId={event.teamId} onSuccess={() => setShowEdit(false)} />
      </Modal>
    </Stack>
  )
}

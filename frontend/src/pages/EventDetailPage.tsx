import { useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useParams } from 'react-router-dom'
import { Edit, Trash2, Eye, EyeOff, Plus, Users, Info } from 'lucide-react'
import { useEvent, useDeleteEvent, useUpdateEvent } from '@/hooks/useEvents'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useConfirm } from '@/context/ConfirmContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Badge } from '@/components/shared/Badge'
import { EventForm } from '@/components/events/EventForm'
import { EventHostManager } from '@/components/events/EventHostManager'
import { RowActions } from '@/components/shared/RowActions'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`event-tabpanel-${index}`}
      aria-labelledby={`event-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  )
}

export function EventDetailPage() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const [showEdit, setShowEdit] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [showAddHostModal, setShowAddHostModal] = useState(false)

  const { data: event, isLoading, error } = useEvent(eventId)
  const { data: teamMembersResponse } = useTeamMembers(event?.teamId ?? '')
  const { mutate: deleteEvent } = useDeleteEvent()
  const { mutate: updateEvent } = useUpdateEvent()
  const { confirm } = useConfirm()

  const teamMembers = teamMembersResponse?.members ?? []

  if (isLoading) return <PageSpinner />
  if (error || !event) return <ErrorAlert message="Failed to load event." />

  return (
    <Stack spacing={4}>
      <PageHeader
        title={event.name}
        subtitle={event.description ?? undefined}
        backTo={`/teams/${event.teamId}`}
        backLabel="Team"
        tags={
          <Badge
            label={event.isActive ? 'Active' : 'Inactive'}
            variant={event.isActive ? 'green' : 'red'}
          />
        }
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <RowActions
              actions={[
                {
                  label: 'Edit event details',
                  icon: <Edit size={16} />,
                  onClick: () => setShowEdit(true),
                },
                {
                  label: event.isActive ? 'Mark as Inactive' : 'Mark as Active',
                  icon: event.isActive ? <EyeOff size={16} /> : <Eye size={16} />,
                  onClick: async () => {
                    const newStatus = !event.isActive
                    if (
                      await confirm({
                        title: newStatus ? 'Mark as Active' : 'Mark as Inactive',
                        message: newStatus
                          ? `Are you sure you want to mark event "${event.name}" as active? This will make it visible on the public booking page.`
                          : `Are you sure you want to mark event "${event.name}" as inactive? This will hide it from the public booking page but keep its configuration.`,
                      })
                    ) {
                      updateEvent({ eventId, data: { isActive: newStatus } })
                    }
                  },
                },
                {
                  label: 'Delete event',
                  icon: <Trash2 size={16} />,
                  color: 'error.main',
                  onClick: async () => {
                    if (
                      await confirm({
                        title: 'Delete Event',
                        message: `Are you sure you want to PERMANENTLY delete event "${event.name}"?\n\nThis action cannot be undone and all associated host assignments will be lost.`,
                      })
                    ) {
                      deleteEvent(eventId)
                    }
                  },
                },
              ]}
            />
          </Stack>
        }
      />

      <Box sx={{ px: { xs: 2.5, md: 4 } }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            mt: 2,
            mb: 3,
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(_: React.SyntheticEvent, v: number) => setTabValue(v)}
            aria-label="event detail sections"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
              },
              '& .MuiTabs-indicator': {
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab label="Details" icon={<Info size={18} />} iconPosition="start" />
            <Tab label={`Hosts (${event.hosts?.length ?? 0})`} icon={<Users size={18} />} iconPosition="start" />
          </Tabs>

          {tabValue === 1 && (
            <Box sx={{ mb: 1 }}>
              <Button size="sm" onClick={() => setShowAddHostModal(true)}>
                <Plus size={16} /> Add coach
              </Button>
            </Box>
          )}
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Paper component="section" variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 1, mb: 3, fontSize: '0.75rem', fontWeight: 700 }}
            >
              General Details
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Offering</Typography>
                <Typography variant="body2" fontWeight={500}>{event.offering.name}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Interaction type</Typography>
                <Typography variant="body2" fontWeight={500}>{event.interactionType.name} ({event.interactionType.key})</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Assignment strategy</Typography>
                <Typography variant="body2" fontWeight={500}>{event.assignmentStrategy}</Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Location type</Typography>
                <Typography variant="body2">{event.locationType}</Typography>
              </Grid>
              {event.locationValue && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Location</Typography>
                  <Typography variant="body2">{event.locationValue}</Typography>
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Duration</Typography>
                <Typography variant="body2">{event.durationSeconds / 60} min</Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Round robin</Typography>
                <Typography variant="body2">{event.interactionType.supportsRoundRobin ? 'Enabled' : 'Disabled'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Multiple hosts</Typography>
                <Typography variant="body2">{event.interactionType.supportsMultipleHosts ? 'Supported' : 'Not supported'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Hosts (Min / Max)</Typography>
                <Typography variant="body2">{event.interactionType.minHosts} / {event.interactionType.maxHosts ?? '∞'}</Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="text.secondary">Participants (Min / Max)</Typography>
                <Typography variant="body2">{event.interactionType.minParticipants} / {event.interactionType.maxParticipants ?? '∞'}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <EventHostManager
            eventId={eventId}
            hosts={event.hosts}
            teamMembers={teamMembers}
            assignmentStrategy={event.assignmentStrategy}
            hideHeader
            showAddModalOverride={showAddHostModal}
            onCloseAddModal={() => setShowAddHostModal(false)}
          />
        </TabPanel>

        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit event" size="lg">
          <EventForm
            event={event}
            teamId={event.teamId}
            onSuccess={() => setShowEdit(false)}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>
      </Box>
    </Stack>
  )
}

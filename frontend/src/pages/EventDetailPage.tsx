import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useParams } from 'react-router-dom'
import { Edit, Trash2, Eye, EyeOff, Plus, Users, Info, Calendar as CalendarIcon } from 'lucide-react'
import { useEvent, useDeleteEvent, useUpdateEvent, useEventScheduleSlots } from '@/hooks/useEvents'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/shared/Button'
import { Modal } from '@/components/shared/Modal'
import { PageSpinner } from '@/components/shared/Spinner'
import { ErrorAlert } from '@/components/shared/ErrorAlert'
import { Badge } from '@/components/shared/Badge'
import { EventForm } from '@/components/events/EventForm'
import { EventHostManager } from '@/components/events/EventHostManager'
import { EventScheduleSlotManager } from '@/components/events/EventScheduleSlotManager'
import { EventDetailOverview } from '@/components/events/EventDetailOverview'
import { RowActions } from '@/components/shared/RowActions'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { getEventHostSetupStatus } from '@/components/events/eventCapabilityRules'

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
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  const { data: event, isLoading, error } = useEvent(eventId)
  const { data: slotsRes, isLoading: isLoadingSlots } = useEventScheduleSlots(eventId)
  const { data: teamMembersResponse } = useTeamMembers(event?.teamId ?? '')
  const updateEventMutation = useUpdateEvent()
  const deleteEventMutation = useDeleteEvent()
  const { handleAction } = useAsyncAction()

  const slots = slotsRes?.slots ?? []
  const teamMembers = teamMembersResponse?.members ?? []
  const hostSetupStatus = getEventHostSetupStatus({
    activeHostCount: event?.hosts?.length ?? 0,
    assignmentStrategy: event?.assignmentStrategy,
    interactionType: event?.interactionType,
  })
  const needsScheduleSlots = event?.bookingMode === 'FIXED_SLOTS' && slots.length === 0

  if (isLoading) return <PageSpinner />
  if (error || !event) return <ErrorAlert message="Failed to load event." />

  const handleToggleStatus = (isActive: boolean) => {
    handleAction(
      (vars) => updateEventMutation.mutate(vars),
      { eventId, data: { isActive } },
      {
        title: isActive ? 'Mark as Active' : 'Mark as Inactive',
        message: isActive
          ? `Are you sure you want to mark event "${event.name}" as active? This will make it visible on the public booking page.`
          : `Are you sure you want to mark event "${event.name}" as inactive? This will hide it from the public booking page but keep its configuration.`,
        actionName: 'Status Update',
      }
    )
  }

  const handleDelete = () => {
    handleAction(
      (id) => deleteEventMutation.mutate(id),
      eventId,
      {
        title: 'Delete Event',
        message: `Are you sure you want to PERMANENTLY delete event "${event.name}"?\n\nThis action cannot be undone and all associated host assignments will be lost.`,
        actionName: 'Deletion',
      }
    )
  }

  return (
    <Stack spacing={4}>
      <PageHeader
        title={event.name}
        subtitle={event.description ?? undefined}
        backTo={`/teams/${event.teamId}`}
        backLabel="Team"
        tags={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Badge
              label={event.isActive ? 'Active' : 'Inactive'}
              variant={event.isActive ? 'green' : 'red'}
            />
            {!hostSetupStatus.isReady && <Badge label="Needs Hosts" variant="yellow" />}
            {needsScheduleSlots && <Badge label="Needs Slots" variant="yellow" />}
          </Stack>
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
                  onClick: () => handleToggleStatus(!event.isActive),
                },
                {
                  label: 'Delete event',
                  icon: <Trash2 size={16} />,
                  color: 'error.main',
                  onClick: handleDelete,
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
            {event.bookingMode === 'FIXED_SLOTS' && (
              <Tab label="Schedule" icon={<CalendarIcon size={18} />} iconPosition="start" />
            )}
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
          <Stack spacing={2}>
            {!hostSetupStatus.isReady && (
              <Alert severity="warning" variant="standard" sx={{ mt: 2 }}>
                {hostSetupStatus.message}
              </Alert>
            )}
            {needsScheduleSlots && (
              <Alert severity="info" variant="standard" sx={{ mt: 2 }}>
                This event is in fixed-slot mode, so add one or more schedule slots before sharing it for booking.
              </Alert>
            )}

            <EventDetailOverview event={event} />
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <EventHostManager
            eventId={eventId}
            hosts={event.hosts}
            teamMembers={teamMembers}
            assignmentStrategy={event.assignmentStrategy}
            interactionType={event.interactionType}
            hideHeader
            showAddModalOverride={showAddHostModal}
            onCloseAddModal={() => setShowAddHostModal(false)}
            onViewUser={setViewingUserId}
          />
        </TabPanel>

        {event.bookingMode === 'FIXED_SLOTS' && (
          <TabPanel value={tabValue} index={2}>
            <EventScheduleSlotManager
              event={event}
              slots={slots}
              isLoading={isLoadingSlots}
            />
          </TabPanel>
        )}

        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit event" size="lg">
          <EventForm
            event={event}
            teamId={event.teamId}
            onSuccess={() => setShowEdit(false)}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>

        {viewingUserId && (
          <UserDetailModal
            userId={viewingUserId}
            onClose={() => setViewingUserId(null)}
          />
        )}
      </Box>
    </Stack>
  )
}

import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useParams } from 'react-router-dom'
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Plus,
  Users,
  Info,
  Calendar as CalendarIcon,
  ClipboardList,
} from 'lucide-react'
import { useEvent, useDeleteEvent, useUpdateEvent, useEventScheduleSlots } from '@/hooks/queries/useEvents'
import { useTeamMembers } from '@/hooks/queries/useTeamMembers'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { PageHeader } from '@/components/shared/PageHeader'
import { TabPanel } from '@/components/shared/ui/TabPanel'
import { Button } from '@/components/shared/ui/Button'
import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { Badge } from '@/components/shared/ui/Badge'
import { EventForm } from '@/components/events/form/EventForm'
import { RowActions } from '@/components/shared/table/RowActions'
import { UserDetailModal } from '@/components/users/UserDetailModal'
import { EventDetailsTab } from '@/components/events/tabs/EventDetailsTab'
import { EventCoachesTab } from '@/components/events/tabs/EventCoachesTab'
import { EventBookingsTab } from '@/components/events/tabs/EventBookingsTab'
import { BookingViewProvider } from '@/context/bookingView'
import { EventScheduleTab } from '@/components/events/tabs/EventScheduleTab'
import { getEventCoachSetupStatus } from '@/components/events/form/eventCapabilityRules'

export function EventDetailPage() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const [showEdit, setShowEdit] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const [showAddCoachModal, setShowAddCoachModal] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)

  const { data: event, isLoading, isFetching, error } = useEvent(eventId)
  const { data: slotsRes, isLoading: isLoadingSlots, isFetching: isFetchingSlots } = useEventScheduleSlots(eventId)
  const { data: teamMembersResponse } = useTeamMembers(event?.teamId ?? '')
  const updateEventMutation = useUpdateEvent()
  const deleteEventMutation = useDeleteEvent()
  const { handleAction } = useAsyncAction()

  const slots = slotsRes?.slots ?? []
  const teamMembers = teamMembersResponse?.members ?? []
  const bookingViewValue = useMemo(() => ({ onViewCoach: setViewingUserId }), [])

  if (isLoading) return <PageSpinner />
  if (error || !event) {
    return (
      <Stack spacing={4}>
        <PageHeader title="Event" backTo="/teams" backLabel="Teams" />
        <Box sx={{ px: { xs: 2.5, md: 4 }, py: 4 }}>
          <ErrorAlert message="Failed to load event. Please go back and try again." />
        </Box>
      </Stack>
    )
  }

  const coachSetupStatus = getEventCoachSetupStatus({
    activeCoachCount: event.coaches?.length ?? 0,
    assignmentStrategy: event.assignmentStrategy,
    minCoachCount: event.minCoachCount,
  })
  const needsScheduleSlots = event.bookingMode === 'FIXED_SLOTS' && slots.length === 0

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
    handleAction((id) => deleteEventMutation.mutate(id), eventId, {
      title: 'Delete Event',
      message: `Are you sure you want to PERMANENTLY delete event "${event.name}"?\n\nThis action cannot be undone and all associated coach assignments will be lost.`,
      actionName: 'Deletion',
    })
  }

  return (
    <Stack spacing={4}>
      <PageHeader
        title={event.name}
        subtitle={event.description ?? undefined}
        breadcrumbs={[
          { label: 'Teams', to: '/teams' },
          { label: event.team?.name || 'Team', to: `/teams/${event.teamId}` },
        ]}
        tags={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Badge
              label={event.isActive ? 'Active' : 'Inactive'}
              color={event.isActive ? 'green' : 'red'}
            />
            {!coachSetupStatus.isReady && <Badge label="Needs Coaches" color="yellow" />}
            {needsScheduleSlots && <Badge label="Needs Slots" color="yellow" />}
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
            <Tab
              label={`Coaches (${event.coaches?.length ?? 0})`}
              icon={<Users size={18} />}
              iconPosition="start"
            />
            <Tab 
              label={`Bookings (${event._count?.bookings ?? 0})`} 
              icon={<ClipboardList size={18} />} 
              iconPosition="start" 
            />
            {event.bookingMode === 'FIXED_SLOTS' && (
              <Tab 
                label={`Schedule (${event._count?.scheduleSlots ?? 0})`} 
                icon={<CalendarIcon size={18} />} 
                iconPosition="start" 
              />
            )}
          </Tabs>


        </Box>

        <TabPanel value={tabValue} index={0} prefix="event">
          <EventDetailsTab
            event={event}
            coachSetupStatus={coachSetupStatus}
            needsScheduleSlots={needsScheduleSlots}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1} prefix="event">
          <EventCoachesTab
            event={event}
            teamMembers={teamMembers}
            showAddModal={showAddCoachModal}
            onCloseAddModal={() => setShowAddCoachModal(false)}
            onViewUser={setViewingUserId}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2} prefix="event">
          <BookingViewProvider value={bookingViewValue}>
            <EventBookingsTab eventId={eventId} />
          </BookingViewProvider>
        </TabPanel>

        <TabPanel value={tabValue} index={3} prefix="event">
          <EventScheduleTab event={event} slots={slots} isLoading={isLoadingSlots || isFetchingSlots} teamMembers={teamMembers} />
        </TabPanel>

        <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit event" size="lg">
          <EventForm
            event={event}
            teamId={event.teamId}
            onSuccess={() => setShowEdit(false)}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>

        {viewingUserId && (
          <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
        )}
      </Box>
    </Stack>
  )
}

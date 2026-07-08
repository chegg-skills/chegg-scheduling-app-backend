import { useState, useMemo } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import { alpha } from '@mui/material/styles'
import { useParams } from 'react-router-dom'
import {
  Code,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Info,
  Calendar as CalendarIcon,
  ClipboardList,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react'
import {
  useEvent,
  useDeleteEvent,
  useUpdateEvent,
  useEventScheduleSlots,
} from '@/hooks/queries/useEvents'
import { useTeamMembers } from '@/hooks/queries/useTeamMembers'
import { useBookings } from '@/hooks/queries/useBookings'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { usePermissions } from '@/hooks/usePermissions'
import { useTabParam } from '@/hooks/useTabParam'
import { PageHeader } from '@/components/shared/PageHeader'
import { TabPanel } from '@/components/shared/ui/TabPanel'
import { Modal } from '@/components/shared/ui/Modal'
import { toTitleCase } from '@/utils/toTitleCase'
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
import { EmbedBookingDialog } from '@/components/events/dialogs/EmbedBookingDialog'

export function EventDetailPage() {
  const { eventId = '' } = useParams<{ eventId: string }>()
  const { isCoach } = usePermissions()
  const [showEdit, setShowEdit] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const EVENT_TABS = ['details', 'coaches', 'bookings', 'schedule'] as const
  const [activeTab, setTab] = useTabParam('tab', 'details', EVENT_TABS, { clearOnChange: ['series'] })
  const [showAddCoachModal, setShowAddCoachModal] = useState(false)
  const [viewingUserId, setViewingUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: event, isLoading, error } = useEvent(eventId)
  const {
    data: slotsRes,
    isLoading: isLoadingSlots,
    isFetching: isFetchingSlots,
  } = useEventScheduleSlots(eventId)
  const { data: teamMembersResponse } = useTeamMembers(event?.teamId ?? '')

  const { data: upcomingBookingsRes } = useBookings({
    eventId,
    status: 'CONFIRMED',
    limit: 100,
  })

  const upcomingCount = useMemo(() => {
    const bookings = upcomingBookingsRes?.bookings ?? []
    const now = new Date()
    return bookings.filter((b) => new Date(b.startTime) >= now).length
  }, [upcomingBookingsRes])

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
  })
  const needsScheduleSlots = event.bookingMode === 'FIXED_SLOTS' && slots.length === 0

  const handleCopy = async () => {
    if (event.publicBookingSlug) {
      const shareUrl = `${window.location.origin}/book/event/${event.publicBookingSlug}`
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

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
        title={toTitleCase(event.name)}
        breadcrumbs={[
          { label: 'Teams', to: '/teams' },
          { label: toTitleCase(event.team?.name || 'Team'), to: `/teams/${event.teamId}` },
          { label: 'Event' },
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
          !isCoach ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              {event.publicBookingSlug && (
                <>
                  <Tooltip title="Open booking page" arrow>
                    <IconButton
                      onClick={() => {
                        const shareUrl = `${window.location.origin}/book/event/${event.publicBookingSlug}`
                        window.open(shareUrl, '_blank', 'noopener,noreferrer')
                      }}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.2,
                        width: 36,
                        height: 36,
                        color: 'text.secondary',
                        bgcolor: 'transparent',
                        '&:hover': {
                          bgcolor: 'action.hover',
                          color: 'primary.main',
                          borderColor: 'primary.main',
                          transform: 'scale(1.05)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <ExternalLink size={16} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={copied ? 'Copied!' : 'Copy booking link'} arrow>
                    <IconButton
                      onClick={handleCopy}
                      sx={{
                        border: '1px solid',
                        borderColor: copied ? 'success.main' : 'divider',
                        borderRadius: 1.2,
                        width: 36,
                        height: 36,
                        bgcolor: (theme) =>
                          copied ? alpha(theme.palette.success.main, 0.1) : 'transparent',
                        color: (theme) =>
                          copied ? theme.palette.success.main : 'text.secondary',
                        '&:hover': {
                          bgcolor: (theme) =>
                            copied ? alpha(theme.palette.success.main, 0.1) : 'action.hover',
                          color: (theme) =>
                            copied ? theme.palette.success.main : 'primary.main',
                          borderColor: (theme) =>
                            copied ? theme.palette.success.main : 'primary.main',
                          transform: 'scale(1.05)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <RowActions
                actions={[
                  {
                    label: 'Edit event details',
                    icon: <Edit size={16} />,
                    onClick: () => setShowEdit(true),
                  },
                  {
                    label: 'Add to website',
                    icon: <Code size={16} />,
                    onClick: () => setShowEmbed(true),
                    disabled: !event.isActive || !event.publicBookingSlug,
                    tooltip: !event.publicBookingSlug
                      ? 'Set a public URL for this event first'
                      : undefined,
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
          ) : null
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
            value={activeTab}
            onChange={(_, v: string) => setTab(v as (typeof EVENT_TABS)[number])}
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
            <Tab value="details" label="Details" icon={<Info size={18} />} iconPosition="start" />
            <Tab
              value="coaches"
              label={`Coaches (${event.coaches?.length ?? 0})`}
              icon={<Users size={18} />}
              iconPosition="start"
            />
            <Tab
              value="bookings"
              label={`Bookings (${upcomingCount})`}
              icon={<ClipboardList size={18} />}
              iconPosition="start"
            />
            {event.bookingMode === 'FIXED_SLOTS' && (
              <Tab
                value="schedule"
                label={`Schedule (${event._count?.scheduleSlots ?? 0})`}
                icon={<CalendarIcon size={18} />}
                iconPosition="start"
              />
            )}
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index="details" prefix="event">
          <EventDetailsTab
            event={event}
            coachSetupStatus={coachSetupStatus}
            needsScheduleSlots={needsScheduleSlots}
          />
        </TabPanel>

        <TabPanel value={activeTab} index="coaches" prefix="event">
          <EventCoachesTab
            event={event}
            teamMembers={teamMembers}
            showAddModal={showAddCoachModal}
            onOpenAddModal={() => setShowAddCoachModal(true)}
            onCloseAddModal={() => setShowAddCoachModal(false)}
            onViewUser={setViewingUserId}
            canManage={!isCoach}
          />
        </TabPanel>

        <TabPanel value={activeTab} index="bookings" prefix="event">
          <BookingViewProvider value={bookingViewValue}>
            <EventBookingsTab eventId={eventId} />
          </BookingViewProvider>
        </TabPanel>

        <TabPanel value={activeTab} index="schedule" prefix="event">
          <EventScheduleTab
            event={event}
            slots={slots}
            isLoading={isLoadingSlots || isFetchingSlots}
            canManage={!isCoach}
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

        {viewingUserId && (
          <UserDetailModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
        )}

        {showEmbed && (
          <EmbedBookingDialog isOpen onClose={() => setShowEmbed(false)} event={event} />
        )}
      </Box>
    </Stack>
  )
}

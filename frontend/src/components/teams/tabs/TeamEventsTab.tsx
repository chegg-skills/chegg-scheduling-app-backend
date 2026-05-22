import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventGroupSections } from '@/components/events/groups/EventGroupSections'
import { EventForm } from '@/components/events/form/EventForm'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import Stack from '@mui/material/Stack'
import type { Event, EventGroup } from '@/types'

interface TeamEventsTabProps {
  events: Event[]
  groups: EventGroup[]
  teamId: string
  isLoading: boolean
  error?: unknown
  canManage?: boolean
  showCreateModal: boolean
  onCloseCreateModal: () => void
}

export function TeamEventsTab({
  events,
  groups,
  teamId,
  isLoading,
  error,
  canManage = false,
  showCreateModal,
  onCloseCreateModal,
}: TeamEventsTabProps) {
  return (
    <Stack spacing={4}>
      <SectionHeader
        title="Team Events"
        description="Manage scheduling events and coaching assignments for this team."
      />
      {error ? (
        <ErrorAlert message="Failed to load events. Please refresh the page." />
      ) : isLoading ? (
        <PageSpinner />
      ) : (
        <EventGroupSections groups={groups} events={events} teamId={teamId} canManage={canManage} />
      )}

      <Modal isOpen={showCreateModal} onClose={onCloseCreateModal} title="New event" size="lg">
        <EventForm teamId={teamId} onSuccess={onCloseCreateModal} onCancel={onCloseCreateModal} />
      </Modal>
    </Stack>
  )
}

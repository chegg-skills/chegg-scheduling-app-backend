import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { ErrorAlert } from '@/components/shared/ui/ErrorAlert'
import { EventTable } from '@/components/events/table/EventTable'
import { EventForm } from '@/components/events/form/EventForm'
import { SectionHeader } from '@/components/shared/ui/SectionHeader'
import Stack from '@mui/material/Stack'
import type { Event } from '@/types'

interface TeamEventsTabProps {
  events: Event[]
  teamId: string
  isLoading: boolean
  error?: unknown
  showCreateModal: boolean
  onCloseCreateModal: () => void
}

export function TeamEventsTab({
  events,
  teamId,
  isLoading,
  error,
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
        <EventTable events={events} teamId={teamId} />
      )}

      <Modal isOpen={showCreateModal} onClose={onCloseCreateModal} title="New event" size="lg">
        <EventForm teamId={teamId} onSuccess={onCloseCreateModal} onCancel={onCloseCreateModal} />
      </Modal>
    </Stack>
  )
}

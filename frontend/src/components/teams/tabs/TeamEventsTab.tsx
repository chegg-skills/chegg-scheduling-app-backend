import { Modal } from '@/components/shared/ui/Modal'
import { PageSpinner } from '@/components/shared/ui/Spinner'
import { EventTable } from '@/components/events/table/EventTable'
import { EventForm } from '@/components/events/form/EventForm'
import type { Event } from '@/types'

interface TeamEventsTabProps {
  events: Event[]
  teamId: string
  isLoading: boolean
  showCreateModal: boolean
  onCloseCreateModal: () => void
}

export function TeamEventsTab({
  events,
  teamId,
  isLoading,
  showCreateModal,
  onCloseCreateModal,
}: TeamEventsTabProps) {
  return (
    <>
      {isLoading ? <PageSpinner /> : <EventTable events={events} teamId={teamId} />}

      <Modal isOpen={showCreateModal} onClose={onCloseCreateModal} title="New event" size="lg">
        <EventForm teamId={teamId} onSuccess={onCloseCreateModal} onCancel={onCloseCreateModal} />
      </Modal>
    </>
  )
}

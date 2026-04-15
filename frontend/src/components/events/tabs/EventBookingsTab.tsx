import { EventBookingList } from '../EventBookingList'

interface EventBookingsTabProps {
  eventId: string
  onViewHost: (userId: string) => void
}

export function EventBookingsTab({ eventId, onViewHost }: EventBookingsTabProps) {
  return <EventBookingList eventId={eventId} onViewHost={onViewHost} />
}

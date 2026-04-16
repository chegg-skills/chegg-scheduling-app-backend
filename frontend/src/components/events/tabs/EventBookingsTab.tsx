import { EventBookingList } from '../EventBookingList'

interface EventBookingsTabProps {
  eventId: string
}

export function EventBookingsTab({ eventId }: EventBookingsTabProps) {
  return <EventBookingList eventId={eventId} />
}

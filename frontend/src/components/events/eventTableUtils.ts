import type { Event } from '@/types'
import type { SortAccessorMap } from '@/hooks/useTableSort'

export function formatEventDuration(seconds: number) {
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export type EventSortKey = 'event' | 'offering' | 'duration' | 'hosts' | 'strategy' | 'status' | 'bookingLink'

export const eventSortAccessors: SortAccessorMap<Event, EventSortKey> = {
  event: (event) => event.name,
  offering: (event) => event.offering?.name ?? '',
  duration: (event) => event.durationSeconds,
  hosts: (event) => event.hosts.length,
  strategy: (event) => event.assignmentStrategy,
  status: (event) => event.isActive,
  bookingLink: () => '',
}

export const eventTableColumns: Array<{
  label: string
  sortKey: EventSortKey
  tooltip?: string
}> = [
    { label: 'Event', sortKey: 'event' },
    {
      label: 'Offering',
      sortKey: 'offering',
      tooltip: 'The category this event belongs to (e.g., Tutorial).',
    },
    { label: 'Duration', sortKey: 'duration' },
    { label: 'Hosts', sortKey: 'hosts' },
    {
      label: 'Strategy',
      sortKey: 'strategy',
      tooltip: 'How hosts are assigned (Direct or Round Robin).',
    },
    { label: 'Status', sortKey: 'status' },
    { label: 'Booking Link', sortKey: 'bookingLink' },
  ]

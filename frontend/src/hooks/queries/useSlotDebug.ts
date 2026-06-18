import { useQuery } from '@tanstack/react-query'
import { eventsApi } from '@/api/events'

/**
 * Fetches the admin slot-availability debug report for a single date. Enabled
 * only while the debug tab is open and a date is chosen, so students never
 * trigger it. See `availabilityDebug.service.ts` on the backend.
 */
export function useSlotDebugReport(
  eventId: string | undefined,
  date: string | null,
  timezone: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ['events', eventId, 'slotDebug', date, timezone],
    queryFn: ({ signal }) =>
      eventsApi
        .getSlotDebugReport(eventId as string, date as string, timezone, signal)
        .then((r) => r.data.data ?? null),
    enabled: enabled && !!eventId && !!date,
    staleTime: 30 * 1000,
  })
}

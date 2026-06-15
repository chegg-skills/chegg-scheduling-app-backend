import { useQuery } from '@tanstack/react-query'
import { trackerApi, type TrackerSlotsParams } from '@/api/tracker'

export const trackerKeys = {
  all: ['tracker'] as const,
  slots: (params?: TrackerSlotsParams) => [...trackerKeys.all, 'slots', params] as const,
  filters: () => [...trackerKeys.all, 'filters'] as const,
}

export function useTrackerSlots(params?: TrackerSlotsParams) {
  return useQuery({
    queryKey: trackerKeys.slots(params),
    queryFn: ({ signal }) =>
      trackerApi.getSlots(params, signal).then((r) => r.data.data ?? []),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useTrackerFilters() {
  return useQuery({
    queryKey: trackerKeys.filters(),
    queryFn: ({ signal }) =>
      trackerApi.getFilters(signal).then((r) => r.data.data ?? { teams: [], events: [] }),
    staleTime: 60_000,
  })
}

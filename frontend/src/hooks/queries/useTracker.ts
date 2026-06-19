import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { trackerApi, type TrackerSlotsParams, type TrackerSessionDatesParams } from '@/api/tracker'

export const trackerKeys = {
  all: ['tracker'] as const,
  slots: (params?: TrackerSlotsParams) => [...trackerKeys.all, 'slots', params] as const,
  filters: () => [...trackerKeys.all, 'filters'] as const,
  sessionDates: (params?: TrackerSessionDatesParams) => [...trackerKeys.all, 'session-dates', params] as const,
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

export function useTrackerSessionDates(params: TrackerSessionDatesParams) {
  const { data } = useQuery({
    queryKey: trackerKeys.sessionDates(params),
    queryFn: ({ signal }) =>
      trackerApi.getSessionDates(params, signal).then((r) => r.data.data?.dates ?? []),
    staleTime: 5 * 60 * 1000,
  })
  return useMemo(() => new Set(data ?? []), [data])
}

export function useTrackerFilters() {
  return useQuery({
    queryKey: trackerKeys.filters(),
    queryFn: ({ signal }) =>
      trackerApi.getFilters(signal).then((r) => r.data.data ?? { teams: [], events: [] }),
    staleTime: 60_000,
  })
}

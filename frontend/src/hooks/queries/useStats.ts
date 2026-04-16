import { useQuery } from '@tanstack/react-query'
import { statsApi, type StatsParams } from '@/api/stats'

export const statsKeys = {
  all: ['stats'] as const,
  dashboard: (params?: StatsParams) => [...statsKeys.all, 'dashboard', params] as const,
  bookings: (params?: StatsParams) => [...statsKeys.all, 'bookings', params] as const,
  users: (params?: StatsParams) => [...statsKeys.all, 'users', params] as const,
  teams: (params?: StatsParams) => [...statsKeys.all, 'teams', params] as const,
  events: (params?: StatsParams) => [...statsKeys.all, 'events', params] as const,
  offerings: (params?: StatsParams) => [...statsKeys.all, 'offerings', params] as const,
  interactionTypes: (params?: StatsParams) =>
    [...statsKeys.all, 'interaction-types', params] as const,
  trends: (params?: StatsParams) => [...statsKeys.all, 'trends', params] as const,
  teamPerformance: (params?: StatsParams) =>
    [...statsKeys.all, 'teams-performance', params] as const,
  peakActivity: (params?: StatsParams) => [...statsKeys.all, 'peak-activity', params] as const,
}

function useStatsQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: (context: { signal: AbortSignal }) => Promise<TData>
) {
  return useQuery({
    queryKey,
    queryFn,
    placeholderData: (prev) => prev,
  })
}

export function useDashboardStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.dashboard(params), ({ signal }) =>
    statsApi.getDashboard(params, signal).then((r) => r.data.data)
  )
}

export function useBookingStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.bookings(params), ({ signal }) =>
    statsApi.getBookings(params, signal).then((r) => r.data.data)
  )
}

export function useUserStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.users(params), ({ signal }) =>
    statsApi.getUsers(params, signal).then((r) => r.data.data)
  )
}

export function useTeamStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.teams(params), ({ signal }) =>
    statsApi.getTeams(params, signal).then((r) => r.data.data)
  )
}

export function useEventStats(timeframe: StatsParams['timeframe'], teamId?: string) {
  const params = { timeframe, teamId }
  return useStatsQuery(statsKeys.events(params), ({ signal }) =>
    statsApi.getEvents(params, signal).then((r) => r.data.data)
  )
}

export function useOfferingStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.offerings(params), ({ signal }) =>
    statsApi.getOfferings(params, signal).then((r) => r.data.data)
  )
}

export function useInteractionTypeStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.interactionTypes(params), ({ signal }) =>
    statsApi.getInteractionTypes(params, signal).then((r) => r.data.data)
  )
}

export function useBookingTrends(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.trends(params), ({ signal }) =>
    statsApi.getTrends(params, signal).then((r) => r.data.data)
  )
}

export function useTeamPerformance(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.teamPerformance(params), ({ signal }) =>
    statsApi.getTeamPerformance(params, signal).then((r) => r.data.data)
  )
}

export function usePeakActivity(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.peakActivity(params), ({ signal }) =>
    statsApi.getPeaks(params, signal).then((r) => r.data.data)
  )
}

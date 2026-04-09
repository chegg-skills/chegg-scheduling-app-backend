import { useQuery } from '@tanstack/react-query'
import { statsApi, type StatsParams } from '@/api/stats'
import { preservePreviousData } from './queryUtils'

export const statsKeys = {
  all: ['stats'] as const,
  dashboard: (params?: StatsParams) => [...statsKeys.all, 'dashboard', params] as const,
  bookings: (params?: StatsParams) => [...statsKeys.all, 'bookings', params] as const,
  users: (params?: StatsParams) => [...statsKeys.all, 'users', params] as const,
  teams: (params?: StatsParams) => [...statsKeys.all, 'teams', params] as const,
  events: (params?: StatsParams) => [...statsKeys.all, 'events', params] as const,
  offerings: (params?: StatsParams) => [...statsKeys.all, 'offerings', params] as const,
  interactionTypes: (params?: StatsParams) => [...statsKeys.all, 'interaction-types', params] as const,
}

function useStatsQuery<TData>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<TData>,
) {
  return useQuery({
    queryKey,
    queryFn,
    placeholderData: preservePreviousData,
  })
}

export function useDashboardStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.dashboard(params), () => statsApi.getDashboard(params).then((r) => r.data.data))
}

export function useBookingStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.bookings(params), () => statsApi.getBookings(params).then((r) => r.data.data))
}

export function useUserStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.users(params), () => statsApi.getUsers(params).then((r) => r.data.data))
}

export function useTeamStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.teams(params), () => statsApi.getTeams(params).then((r) => r.data.data))
}

export function useEventStats(timeframe: StatsParams['timeframe'], teamId?: string) {
  const params = { timeframe, teamId }
  return useStatsQuery(statsKeys.events(params), () => statsApi.getEvents(params).then((r) => r.data.data))
}

export function useOfferingStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.offerings(params), () => statsApi.getOfferings(params).then((r) => r.data.data))
}

export function useInteractionTypeStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }
  return useStatsQuery(statsKeys.interactionTypes(params), () => statsApi.getInteractionTypes(params).then((r) => r.data.data))
}

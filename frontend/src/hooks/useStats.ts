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
  interactionTypes: (params?: StatsParams) => [...statsKeys.all, 'interaction-types', params] as const,
}

export function useDashboardStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }

  return useQuery({
    queryKey: statsKeys.dashboard(params),
    queryFn: () => statsApi.getDashboard(params).then((r) => r.data.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useBookingStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }

  return useQuery({
    queryKey: statsKeys.bookings(params),
    queryFn: () => statsApi.getBookings(params).then((r) => r.data.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useUserStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }

  return useQuery({
    queryKey: statsKeys.users(params),
    queryFn: () => statsApi.getUsers(params).then((r) => r.data.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useTeamStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }

  return useQuery({
    queryKey: statsKeys.teams(params),
    queryFn: () => statsApi.getTeams(params).then((r) => r.data.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useEventStats(timeframe: StatsParams['timeframe'], teamId?: string) {
  const params = { timeframe, teamId }

  return useQuery({
    queryKey: statsKeys.events(params),
    queryFn: () => statsApi.getEvents(params).then((r) => r.data.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useOfferingStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }

  return useQuery({
    queryKey: statsKeys.offerings(params),
    queryFn: () => statsApi.getOfferings(params).then((r) => r.data.data),
    placeholderData: (previousData) => previousData,
  })
}

export function useInteractionTypeStats(timeframe: StatsParams['timeframe']) {
  const params = { timeframe }

  return useQuery({
    queryKey: statsKeys.interactionTypes(params),
    queryFn: () => statsApi.getInteractionTypes(params).then((r) => r.data.data),
    placeholderData: (previousData) => previousData,
  })
}

import apiClient from '@/lib/axios'
import type { ApiResponse, StatsSummary, StatsTimeframe } from '@/types'

export interface StatsParams {
  timeframe?: StatsTimeframe
  teamId?: string
}

export const statsApi = {
  getDashboard: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/dashboard', { params, signal }),

  getBookings: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/bookings', { params, signal }),

  getUsers: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/users', { params, signal }),

  getTeams: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/teams', { params, signal }),

  getEvents: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/events', { params, signal }),

  getOfferings: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/offerings', { params, signal }),

  getInteractionTypes: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/interaction-types', { params, signal }),
}

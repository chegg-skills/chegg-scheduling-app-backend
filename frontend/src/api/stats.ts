import apiClient from '@/lib/axios'
import type { ApiResponse, StatsSummary, StatsTimeframe } from '@/types'

export interface StatsParams {
  timeframe?: StatsTimeframe
  teamId?: string
}

export const statsApi = {
  getDashboard: (params?: StatsParams) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/dashboard', { params }),

  getBookings: (params?: StatsParams) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/bookings', { params }),

  getUsers: (params?: StatsParams) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/users', { params }),

  getTeams: (params?: StatsParams) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/teams', { params }),

  getEvents: (params?: StatsParams) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/events', { params }),

  getOfferings: (params?: StatsParams) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/offerings', { params }),

  getInteractionTypes: (params?: StatsParams) =>
    apiClient.get<ApiResponse<StatsSummary>>('/v1/stats/interaction-types', { params }),
}

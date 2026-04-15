import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  StatsSummary,
  StatsTimeframe,
  BookingTrendsStats,
  TeamPerformanceStats,
  PeakActivityStats,
} from '@/types'

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

  getTrends: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary<BookingTrendsStats>>>('/v1/stats/trends', {
      params,
      signal,
    }),

  getTeamPerformance: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary<TeamPerformanceStats>>>('/v1/stats/teams/performance', {
      params,
      signal,
    }),

  getPeaks: (params?: StatsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<StatsSummary<PeakActivityStats>>>('/v1/stats/activity/peaks', {
      params,
      signal,
    }),
}

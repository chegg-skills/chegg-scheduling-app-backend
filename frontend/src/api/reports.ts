import apiClient from '@/lib/axios'
import type { ApiResponse, StatsTimeframe } from '@/types'

export const reportsApi = {
  getBookingsReport: (timeframe: StatsTimeframe, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<any[]>>('/v1/reports/bookings', {
      params: { timeframe, format: 'json' },
      signal,
    }),

  getPerformanceReport: (timeframe: StatsTimeframe, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<any[]>>('/v1/reports/performance', {
      params: { timeframe, format: 'json' },
      signal,
    }),

  getStudentReport: (timeframe: StatsTimeframe, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<any[]>>('/v1/reports/students', {
      params: { timeframe, format: 'json' },
      signal,
    }),
}

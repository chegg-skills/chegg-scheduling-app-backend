import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import type { StatsTimeframe } from '@/types'

export const reportKeys = {
  all: ['reports'] as const,
  type: (reportType: string, timeframe: StatsTimeframe) =>
    [...reportKeys.all, reportType, timeframe] as const,
}

export function useBookingsReport(timeframe: StatsTimeframe) {
  return useQuery({
    queryKey: reportKeys.type('bookings', timeframe),
    queryFn: ({ signal }) =>
      reportsApi.getBookingsReport(timeframe, signal).then((res) => res.data.data ?? []),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePerformanceReport(timeframe: StatsTimeframe) {
  return useQuery({
    queryKey: reportKeys.type('performance', timeframe),
    queryFn: ({ signal }) =>
      reportsApi.getPerformanceReport(timeframe, signal).then((res) => res.data.data ?? []),
    staleTime: 5 * 60 * 1000,
  })
}

export function useStudentReport(timeframe: StatsTimeframe) {
  return useQuery({
    queryKey: reportKeys.type('students', timeframe),
    queryFn: ({ signal }) =>
      reportsApi.getStudentReport(timeframe, signal).then((res) => res.data.data ?? []),
    staleTime: 5 * 60 * 1000,
  })
}

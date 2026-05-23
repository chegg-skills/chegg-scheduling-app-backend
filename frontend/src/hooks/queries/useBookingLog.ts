import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '@/api/bookings'
import type { UpsertBookingSessionLogDto } from '@/types'
import { bookingKeys } from './useBookings'
import { studentKeys } from './useStudents'
import { statsKeys } from './useStats'
import { invalidateQueryKeys } from '../queryUtils'

export const bookingLogKeys = {
  all: ['bookingLogs'] as const,
  detail: (bookingId: string) => [...bookingLogKeys.all, 'detail', bookingId] as const,
}

export function useBookingSessionLog(bookingId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bookingLogKeys.detail(bookingId),
    queryFn: ({ signal }) =>
      bookingsApi.getSessionLog(bookingId, signal).then((r) => r.data.data ?? null),
    enabled: !!bookingId && (options?.enabled ?? true),
  })
}

export function useUpsertBookingSessionLog(bookingId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertBookingSessionLogDto) =>
      bookingsApi.upsertSessionLog(bookingId, data).then((r) => r.data.data),
    onSuccess: () => {
      invalidateQueryKeys(qc, [
        bookingLogKeys.detail(bookingId),
        bookingKeys.all,
        bookingKeys.detail(bookingId),
        studentKeys.all,
        statsKeys.all,
      ])
    },
  })
}

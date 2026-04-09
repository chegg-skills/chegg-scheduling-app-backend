import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '@/api/bookings'
import type { ListBookingsFilters, BookingStatus } from '@/types'
import { invalidateQueryKeys } from './queryUtils'
import { statsKeys } from './useStats'

export const bookingKeys = {
    all: ['bookings'] as const,
    list: (filters: ListBookingsFilters) => [...bookingKeys.all, 'list', filters] as const,
    detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
}

export function useBookings(filters: ListBookingsFilters = {}) {
    return useQuery({
        queryKey: bookingKeys.list(filters),
        queryFn: ({ signal }) => bookingsApi.list(filters, signal).then(r => ({
            bookings: r.data.data?.bookings ?? [],
            pagination: r.data.data?.pagination
        })),
        placeholderData: (prev) => prev,
    })
}

export function useBooking(id: string) {
    return useQuery({
        queryKey: bookingKeys.detail(id),
        queryFn: ({ signal }) => bookingsApi.getById(id, signal).then(r => r.data.data),
        enabled: !!id,
    })
}

export function useUpdateBookingStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
            bookingsApi.updateStatus(id, { status }),
        onSuccess: (_, { id }) =>
            invalidateQueryKeys(qc, [bookingKeys.all, bookingKeys.detail(id), statsKeys.all]),
    })
}

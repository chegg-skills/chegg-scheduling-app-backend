import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '@/api/bookings'
import type { ListBookingsFilters, BookingStatus } from '@/types'

export const bookingKeys = {
    all: ['bookings'] as const,
    list: (filters: ListBookingsFilters) => [...bookingKeys.all, 'list', filters] as const,
    detail: (id: string) => [...bookingKeys.all, 'detail', id] as const,
}

export function useBookings(filters: ListBookingsFilters = {}) {
    return useQuery({
        queryKey: bookingKeys.list(filters),
        queryFn: () => bookingsApi.list(filters).then(r => r.data.data?.bookings ?? []),
    })
}

export function useBooking(id: string) {
    return useQuery({
        queryKey: bookingKeys.detail(id),
        queryFn: () => bookingsApi.getById(id).then(r => r.data.data),
        enabled: !!id,
    })
}

export function useUpdateBookingStatus() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
            bookingsApi.updateStatus(id, { status }),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: bookingKeys.all })
            qc.invalidateQueries({ queryKey: bookingKeys.detail(id) })
        },
    })
}

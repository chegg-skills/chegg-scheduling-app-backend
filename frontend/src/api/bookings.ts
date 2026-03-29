import apiClient from '@/lib/axios'
import type {
    ApiResponse,
    Booking,
    CreateBookingDto,
    ListBookingsFilters,
    UpdateBookingStatusDto
} from '@/types'

export interface ListBookingsResponse {
    bookings: Booking[]
}

export const bookingsApi = {
    create: (data: CreateBookingDto) =>
        apiClient.post<ApiResponse<Booking>>('/bookings', data),

    list: (filters: ListBookingsFilters = {}) =>
        apiClient.get<ApiResponse<ListBookingsResponse>>('/bookings', { params: filters }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`),

    updateStatus: (id: string, data: UpdateBookingStatusDto) =>
        apiClient.patch<ApiResponse<Booking>>(`/bookings/${id}`, data),
}

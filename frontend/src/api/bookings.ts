import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  Booking,
  CreateBookingDto,
  ListBookingsFilters,
  UpdateBookingStatusDto,
  Pagination,
} from '@/types'

export interface ListBookingsResponse {
  bookings: Booking[]
  pagination: Pagination
}

export const bookingsApi = {
  create: (data: CreateBookingDto) => apiClient.post<ApiResponse<{ booking: Booking }>>('/bookings', data),

  list: (filters: ListBookingsFilters = {}, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListBookingsResponse>>('/bookings', { params: filters, signal }),

  getById: (id: string, token?: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ booking: Booking }>>(`/bookings/${id}`, { params: { token }, signal }),

  reschedule: (
    id: string,
    data: { startTime: Date | string; timezone?: string; token?: string },
    signal?: AbortSignal
  ) => apiClient.post<ApiResponse<{ booking: Booking }>>(`/bookings/${id}/reschedule`, data, { signal }),

  updateStatus: (id: string, data: UpdateBookingStatusDto) =>
    apiClient.patch<ApiResponse<{ booking: Booking }>>(`/bookings/${id}`, data),
}

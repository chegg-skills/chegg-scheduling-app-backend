import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  Booking,
  CreateBookingDto,
  ListBookingsFilters,
  UpdateBookingStatusDto,
  Pagination,
  SessionLog,
  UpsertBookingSessionLogDto,
} from '@/types'

export interface ListBookingsResponse {
  bookings: Booking[]
  pagination: Pagination
}

export const bookingsApi = {
  create: (data: CreateBookingDto) =>
    apiClient.post<ApiResponse<{ booking: Booking }>>('/bookings', data),

  list: (filters: ListBookingsFilters = {}, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListBookingsResponse>>('/bookings', { params: filters, signal }),

  getById: (id: string, token?: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ booking: Booking }>>(`/bookings/${id}`, {
      params: { token },
      signal,
    }),

  reschedule: (
    id: string,
    data: { startTime: Date | string; timezone?: string; token?: string },
    signal?: AbortSignal
  ) =>
    apiClient.post<ApiResponse<{ booking: Booking }>>(`/bookings/${id}/reschedule`, data, {
      signal,
    }),

  cancel: (
    id: string,
    data: { token?: string; cancellationReason?: string },
    signal?: AbortSignal
  ) =>
    apiClient.post<ApiResponse<{ booking: Booking }>>(`/bookings/${id}/cancel`, data, {
      signal,
    }),

  updateStatus: (id: string, data: UpdateBookingStatusDto) =>
    apiClient.patch<ApiResponse<{ booking: Booking }>>(`/bookings/${id}`, data),

  getSessionLog: (bookingId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<SessionLog | null>>(`/bookings/${bookingId}/log`, { signal }),

  upsertSessionLog: (bookingId: string, data: UpsertBookingSessionLogDto) =>
    apiClient.post<ApiResponse<SessionLog>>(`/bookings/${bookingId}/log`, data),

  cancel: (
    id: string,
    data: { token?: string; cancellationReason?: string },
    signal?: AbortSignal
  ) =>
    apiClient.post<ApiResponse<{ booking: Booking }>>(`/bookings/${id}/cancel`, data, { signal }),
}

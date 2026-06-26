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

  bookFollowUp: (
    bookingId: string,
    data: {
      startTime: string | Date
      timezone?: string
      notes?: string
      specificQuestion?: string
      triedSolutions?: string
      usedResources?: string
      sessionObjectives?: string
      customAnswers?: string[]
    }
  ) => apiClient.post<ApiResponse<{ booking: Booking }>>(`/bookings/${bookingId}/follow-up`, data),

  getTimeline: (
    bookingId: string,
    params?: { page?: number; limit?: number },
    signal?: AbortSignal
  ) =>
    apiClient.get<
      ApiResponse<{
        activities: BookingActivity[]
        pagination: Pagination
      }>
    >(`/v1/bookings/${bookingId}/timeline`, { params, signal }),
}

export interface BookingActivity {
  id: string
  bookingId: string
  activityType:
    | 'BOOKING_CREATED'
    | 'BOOKING_CONFIRMED'
    | 'EMAIL_SENT'
    | 'REMINDER_SENT'
    | 'BOOKING_RESCHEDULED'
    | 'BOOKING_CANCELLED'
    | 'SESSION_COMPLETED'
    | 'SESSION_NO_SHOW'
    | 'SESSION_LOGGED'
    | 'COACH_REASSIGNED'
    | 'ATTENDANCE_UPDATED'
    | 'SESSION_LOG_UPDATED'
    | 'FOLLOW_UP_BOOKED'
  timestamp: string
  actorType: 'STUDENT' | 'COACH' | 'ADMIN' | 'SYSTEM'
  actorUserId?: string | null
  actorName?: string | null
  metadata?: any
  actorUser?: {
    id: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
    role: string
  } | null
}


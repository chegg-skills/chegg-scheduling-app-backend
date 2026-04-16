import apiClient from '@/lib/axios'
import type { ApiResponse, StudentSummary, Booking, Pagination } from '@/types'

export interface ListStudentsFilters {
  page?: number
  pageSize?: number
  search?: string
  teamId?: string
  eventId?: string
  hostUserId?: string
}

export interface ListStudentsResponse {
  students: StudentSummary[]
  pagination: Pagination
}

export interface ListStudentBookingsResponse {
  bookings: Booking[]
  pagination: Pagination
}

export interface GetStudentResponse {
  student: StudentSummary
}

export const studentsApi = {
  list: (params: ListStudentsFilters = {}, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListStudentsResponse>>('/students', { params, signal }),

  getById: (id: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<GetStudentResponse>>(`/students/${id}`, { signal }),

  listBookings: (
    id: string,
    params: { page?: number; pageSize?: number } = {},
    signal?: AbortSignal
  ) =>
    apiClient.get<ApiResponse<ListStudentBookingsResponse>>(`/students/${id}/bookings`, {
      params,
      signal,
    }),
}

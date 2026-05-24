import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  StudentSummary,
  Booking,
  Pagination,
  StudentSessionLogEntry,
  StudentCommunicationLog,
} from '@/types'

export type { StudentCommunicationLog }

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

  listSessionLogs: (id: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ sessionLogs: StudentSessionLogEntry[] }>>(
      `/students/${id}/session-logs`,
      { signal }
    ),

  sendEmail: (id: string, data: { subject: string; body: string }) =>
    apiClient.post<ApiResponse<{ log: StudentCommunicationLog }>>(`/students/${id}/send-email`, data),

  listCommunications: (id: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ logs: StudentCommunicationLog[] }>>(`/students/${id}/communications`, {
      signal,
    }),

  retryEmail: (logId: string) =>
    apiClient.post<ApiResponse<{ log: StudentCommunicationLog }>>(`/students/communications/${logId}/retry`),
}

// StudentCommunicationLog is defined in @/types and re-exported above

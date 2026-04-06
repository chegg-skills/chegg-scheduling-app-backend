import apiClient from '@/lib/axios'
import type {
    ApiResponse,
    StudentSummary,
    Booking,
    Pagination
} from '@/types'

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

export const studentsApi = {
    list: (params: ListStudentsFilters = {}) =>
        apiClient.get<ApiResponse<ListStudentsResponse>>('/students', { params }),

    getById: (id: string) =>
        apiClient.get<ApiResponse<StudentSummary>>(`/students/${id}`),

    listBookings: (id: string, params: { page?: number; pageSize?: number } = {}) =>
        apiClient.get<ApiResponse<ListStudentBookingsResponse>>(`/students/${id}/bookings`, { params }),
}

import apiClient from '@/lib/axios'
import type {
    ApiResponse,
    UserWeeklyAvailability,
    UserAvailabilityException,
    SetWeeklyAvailabilityDto,
    CreateAvailabilityExceptionDto,
} from '@/types'

export interface GetExceptionsParams {
    from?: string
    to?: string
}

export const availabilityApi = {
    getWeekly: (userId: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<UserWeeklyAvailability[]>>(`/users/${userId}/availability/weekly`, { signal }),

    setWeekly: (userId: string, data: SetWeeklyAvailabilityDto) =>
        apiClient.post<ApiResponse<UserWeeklyAvailability[]>>(`/users/${userId}/availability/weekly`, data),

    getExceptions: (userId: string, params?: GetExceptionsParams, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<UserAvailabilityException[]>>(`/users/${userId}/availability/exceptions`, { params, signal }),

    getEffective: (userId: string, params: { from: string; to: string }, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<{ weekly: UserWeeklyAvailability[]; exceptions: UserAvailabilityException[] }>>(
            `/users/${userId}/availability/effective`,
            { params, signal }
        ),

    addException: (userId: string, data: CreateAvailabilityExceptionDto) =>
        apiClient.post<ApiResponse<UserAvailabilityException>>(`/users/${userId}/availability/exceptions`, data),

    removeException: (userId: string, exceptionId: string) =>
        apiClient.delete<ApiResponse<null>>(`/users/${userId}/availability/exceptions/${exceptionId}`),
}

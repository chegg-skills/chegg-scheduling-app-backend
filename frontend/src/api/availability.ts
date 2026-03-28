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
    getWeekly: (userId: string) =>
        apiClient.get<ApiResponse<UserWeeklyAvailability[]>>(`/users/${userId}/availability/weekly`),

    setWeekly: (userId: string, data: SetWeeklyAvailabilityDto) =>
        apiClient.post<ApiResponse<UserWeeklyAvailability[]>>(`/users/${userId}/availability/weekly`, data),

    getExceptions: (userId: string, params?: GetExceptionsParams) =>
        apiClient.get<ApiResponse<UserAvailabilityException[]>>(`/users/${userId}/availability/exceptions`, { params }),

    getEffective: (userId: string, params: { from: string; to: string }) =>
        apiClient.get<ApiResponse<{ weekly: UserWeeklyAvailability[]; exceptions: UserAvailabilityException[] }>>(
            `/users/${userId}/availability/effective`,
            { params }
        ),

    addException: (userId: string, data: CreateAvailabilityExceptionDto) =>
        apiClient.post<ApiResponse<UserAvailabilityException>>(`/users/${userId}/availability/exceptions`, data),

    removeException: (userId: string, exceptionId: string) =>
        apiClient.delete<ApiResponse<null>>(`/users/${userId}/availability/exceptions/${exceptionId}`),
}

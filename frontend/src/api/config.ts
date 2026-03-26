import apiClient from '@/lib/axios'
import type { ApiResponse } from '@/types'

export interface TimezonesResponse {
    timezones: string[]
}

export const configApi = {
    getTimezones: () => apiClient.get<ApiResponse<TimezonesResponse>>('/config/timezones'),
}

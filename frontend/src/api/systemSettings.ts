import apiClient from '@/lib/axios'
import type { ApiResponse, SystemSettings, SystemBookingQuestion } from '@/types'

export const systemSettingsApi = {
  get: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ settings: SystemSettings }>>('/system-settings', { signal }),

  update: (data: Partial<SystemSettings>) =>
    apiClient.put<ApiResponse<{ settings: SystemSettings }>>('/system-settings', data),
}

export const bookingQuestionsApi = {
  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ questions: SystemBookingQuestion[] }>>('/system-settings/booking-questions', { signal }),

  create: (text: string) =>
    apiClient.post<ApiResponse<{ question: SystemBookingQuestion }>>('/system-settings/booking-questions', { text }),

  update: (id: string, data: { text?: string; order?: number }) =>
    apiClient.put<ApiResponse<{ question: SystemBookingQuestion }>>(`/system-settings/booking-questions/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<Record<string, never>>>(`/system-settings/booking-questions/${id}`),
}

import apiClient from '@/lib/axios'
import type { ApiResponse, SystemSettings } from '@/types'

export const systemSettingsApi = {
  get: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ settings: SystemSettings }>>('/system-settings', { signal }),

  update: (data: Partial<SystemSettings>) =>
    apiClient.put<ApiResponse<{ settings: SystemSettings }>>('/system-settings', data),
}

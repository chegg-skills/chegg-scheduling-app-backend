import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  SessionType,
  CreateSessionTypeDto,
  UpdateSessionTypeDto,
} from '@/types'

export interface ListSessionTypesResponse {
  sessionTypes: SessionType[]
}

export const sessionTypesApi = {
  create: (data: CreateSessionTypeDto) =>
    apiClient.post<ApiResponse<{ sessionType: SessionType }>>('/session-types', data),

  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListSessionTypesResponse>>('/session-types', { signal }),

  getById: (sessionTypeId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ sessionType: SessionType }>>(`/session-types/${sessionTypeId}`, {
      signal,
    }),

  update: (sessionTypeId: string, data: UpdateSessionTypeDto) =>
    apiClient.patch<ApiResponse<{ sessionType: SessionType }>>(
      `/session-types/${sessionTypeId}`,
      data
    ),

  delete: (sessionTypeId: string) =>
    apiClient.delete<ApiResponse<void>>(`/session-types/${sessionTypeId}`),
}

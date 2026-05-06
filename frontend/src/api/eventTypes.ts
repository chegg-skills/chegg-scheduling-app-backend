import apiClient from '@/lib/axios'
import type { ApiResponse, EventType, CreateEventTypeDto, UpdateEventTypeDto } from '@/types'

export interface ListEventTypesResponse {
  eventTypes: EventType[]
}

export const eventTypesApi = {
  create: (data: CreateEventTypeDto) =>
    apiClient.post<ApiResponse<EventType>>('/event-types', data),

  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListEventTypesResponse>>('/event-types', { signal }),

  update: (eventTypeId: string, data: UpdateEventTypeDto) =>
    apiClient.patch<ApiResponse<EventType>>(`/event-types/${eventTypeId}`, data),

  delete: (eventTypeId: string) =>
    apiClient.delete<ApiResponse<EventType>>(`/event-types/${eventTypeId}`),
}

import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  EventInteractionType,
  CreateInteractionTypeDto,
  UpdateInteractionTypeDto,
} from '@/types'

export interface ListInteractionTypesResponse {
  interactionTypes: EventInteractionType[]
}

export const interactionTypesApi = {
  create: (data: CreateInteractionTypeDto) =>
    apiClient.post<ApiResponse<EventInteractionType>>('/event-interaction-types', data),

  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListInteractionTypesResponse>>('/event-interaction-types', { signal }),

  update: (interactionTypeId: string, data: UpdateInteractionTypeDto) =>
    apiClient.patch<ApiResponse<EventInteractionType>>(
      `/event-interaction-types/${interactionTypeId}`,
      data,
    ),
  delete: (interactionTypeId: string) =>
    apiClient.delete<ApiResponse<EventInteractionType>>(`/event-interaction-types/${interactionTypeId}`),

  getUsage: (interactionTypeId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ id: string; name: string; team: { id: string; name: string } }[]>>(
      `/event-interaction-types/${interactionTypeId}/usage`,
      { signal }
    ),
}

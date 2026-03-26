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

  list: () =>
    apiClient.get<ApiResponse<ListInteractionTypesResponse>>('/event-interaction-types'),

  update: (interactionTypeId: string, data: UpdateInteractionTypeDto) =>
    apiClient.patch<ApiResponse<EventInteractionType>>(
      `/event-interaction-types/${interactionTypeId}`,
      data,
    ),
}

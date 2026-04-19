import apiClient from '@/lib/axios'
import type { ApiResponse, InteractionTypeInfo } from '@/types'

export interface ListInteractionTypesResponse {
  interactionTypes: InteractionTypeInfo[]
}

export const interactionTypesApi = {
  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListInteractionTypesResponse>>('/event-interaction-types', {
      signal,
    }),
}

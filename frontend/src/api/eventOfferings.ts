import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  EventOffering,
  CreateEventOfferingDto,
  UpdateEventOfferingDto,
} from '@/types'

export interface ListOfferingsResponse {
  offerings: EventOffering[]
}

export const eventOfferingsApi = {
  create: (data: CreateEventOfferingDto) =>
    apiClient.post<ApiResponse<EventOffering>>('/event-offerings', data),

  list: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListOfferingsResponse>>('/event-offerings', { signal }),

  update: (offeringId: string, data: UpdateEventOfferingDto) =>
    apiClient.patch<ApiResponse<EventOffering>>(`/event-offerings/${offeringId}`, data),

  delete: (offeringId: string) =>
    apiClient.delete<ApiResponse<EventOffering>>(`/event-offerings/${offeringId}`),
}

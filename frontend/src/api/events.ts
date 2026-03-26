
import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  Event,
  EventHost,
  CreateEventDto,
  UpdateEventDto,
  SetEventHostsDto,
  Pagination,
} from '@/types'

export interface ListEventsParams {
  page?: number
  pageSize?: number
}

export interface ListEventsResponse {
  events: Event[]
  pagination: Pagination
}

export const eventsApi = {
  listAll: () =>
    apiClient.get<ApiResponse<ListEventsResponse>>('/events'),
  create: (teamId: string, data: CreateEventDto) =>
    apiClient.post<ApiResponse<Event>>(`/teams/${teamId}/events`, data),
  listByTeam: (teamId: string, params?: ListEventsParams) =>
    apiClient.get<ApiResponse<ListEventsResponse>>(`/teams/${teamId}/events`, { params }),
  getById: (eventId: string) =>
    apiClient.get<ApiResponse<Event>>(`/events/${eventId}`),
  update: (eventId: string, data: UpdateEventDto) =>
    apiClient.patch<ApiResponse<Event>>(`/events/${eventId}`, data),
  deactivate: (eventId: string) =>
    apiClient.delete<ApiResponse<Event>>(`/events/${eventId}`),
  listHosts: (eventId: string) =>
    apiClient.get<ApiResponse<{ hosts: EventHost[] }>>(`/events/${eventId}/hosts`),
  setHosts: (eventId: string, data: SetEventHostsDto) =>
    apiClient.put<ApiResponse<{ hosts: EventHost[] }>>(`/events/${eventId}/hosts`, data),
  removeHost: (eventId: string, userId: string) =>
    apiClient.delete<ApiResponse<EventHost>>(`/events/${eventId}/hosts/${userId}`),
}

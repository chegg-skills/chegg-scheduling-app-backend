import apiClient from '@/lib/axios'
import type { ApiResponse, EventGroup } from '@/types'

export interface CreateEventGroupDto {
  name: string
  description?: string | null
  color?: string | null
}

export type UpdateEventGroupDto = Partial<CreateEventGroupDto>

export interface ListEventGroupsResponse {
  groups: EventGroup[]
}

export const eventGroupsApi = {
  listByTeam: (teamId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListEventGroupsResponse>>(`/teams/${teamId}/event-groups`, {
      signal,
    }),
  create: (teamId: string, data: CreateEventGroupDto) =>
    apiClient.post<ApiResponse<EventGroup>>(`/teams/${teamId}/event-groups`, data),
  getById: (groupId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<EventGroup>>(`/event-groups/${groupId}`, { signal }),
  update: (groupId: string, data: UpdateEventGroupDto) =>
    apiClient.patch<ApiResponse<EventGroup>>(`/event-groups/${groupId}`, data),
  remove: (groupId: string) =>
    apiClient.delete<ApiResponse<null>>(`/event-groups/${groupId}`),
}

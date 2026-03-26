import apiClient from '@/lib/axios'
import type { ApiResponse, TeamMember } from '@/types'

export interface ListTeamMembersResponse {
  members: TeamMember[]
}

export const teamMembersApi = {
  add: (teamId: string, userId: string) =>
    apiClient.post<ApiResponse<TeamMember>>(`/teams/${teamId}/members`, { userId }),

  list: (teamId: string) =>
    apiClient.get<ApiResponse<ListTeamMembersResponse>>(`/teams/${teamId}/members`),

  remove: (teamId: string, userId: string) =>
    apiClient.delete<ApiResponse<TeamMember>>(`/teams/${teamId}/members/${userId}`),
}

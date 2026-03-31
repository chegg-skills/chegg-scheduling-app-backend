import apiClient from '@/lib/axios'
import type { ApiResponse, TeamMember } from '@/types'

export interface ListTeamMembersResponse {
  members: TeamMember[]
}

export const teamMembersApi = {
  add: (teamId: string, userIds: string | string[]) => {
    const payload = Array.isArray(userIds) ? { userIds } : { userId: userIds };
    return apiClient.post<ApiResponse<TeamMember | TeamMember[]>>(`/teams/${teamId}/members`, payload);
  },

  list: (teamId: string) =>
    apiClient.get<ApiResponse<ListTeamMembersResponse>>(`/teams/${teamId}/members`),

  remove: (teamId: string, userId: string) =>
    apiClient.delete<ApiResponse<TeamMember>>(`/teams/${teamId}/members/${userId}`),
}

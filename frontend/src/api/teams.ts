import apiClient from '@/lib/axios'
import type { ApiResponse, Team, CreateTeamDto, UpdateTeamDto, Pagination } from '@/types'

export interface ListTeamsParams {
  page?: number
  pageSize?: number
}

export interface ListTeamsResponse {
  teams: Team[]
  pagination: Pagination
}

export const teamsApi = {
  create: (data: CreateTeamDto) =>
    apiClient.post<ApiResponse<Team>>('/teams', data),

  list: (params?: ListTeamsParams) =>
    apiClient.get<ApiResponse<ListTeamsResponse>>('/teams', { params }),

  getById: (teamId: string) =>
    apiClient.get<ApiResponse<Team>>(`/teams/${teamId}`),

  update: (teamId: string, data: UpdateTeamDto) =>
    apiClient.patch<ApiResponse<Team>>(`/teams/${teamId}`, data),

  deactivate: (teamId: string) =>
    apiClient.delete<ApiResponse<Team>>(`/teams/${teamId}`),
}

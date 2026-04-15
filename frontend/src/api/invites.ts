import apiClient from '@/lib/axios'
import type { ApiResponse, UserInvite, CreateInviteDto } from '@/types'

export const invitesApi = {
  create: (data: CreateInviteDto) => apiClient.post<ApiResponse<UserInvite>>('/invites', data),
}

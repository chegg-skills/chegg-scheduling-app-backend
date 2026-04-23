import apiClient from '@/lib/axios'
import type { ApiResponse, UserInvite, CreateInviteDto, InviteValidation } from '@/types'

export const invitesApi = {
  create: (data: CreateInviteDto) => apiClient.post<ApiResponse<UserInvite>>('/invites', data),
  validate: (token: string) =>
    apiClient.get<ApiResponse<InviteValidation>>('/invites/validate', { params: { token } }),
}

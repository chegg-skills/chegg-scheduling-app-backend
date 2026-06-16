import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  UserInvite,
  CreateInviteDto,
  InviteValidation,
  InviteListResponse,
  ListInvitesParams,
} from '@/types'

export const invitesApi = {
  create: (data: CreateInviteDto) => apiClient.post<ApiResponse<UserInvite>>('/invites', data),
  validate: (token: string) =>
    apiClient.post<ApiResponse<InviteValidation>>('/invites/validate', { token }),
  list: (params?: ListInvitesParams) =>
    apiClient.get<ApiResponse<InviteListResponse>>('/invites', { params }),
  revoke: (id: string) => apiClient.delete<ApiResponse<UserInvite>>(`/invites/${id}`),
}

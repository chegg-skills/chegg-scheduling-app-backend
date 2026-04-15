import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  AuthPayload,
  LoginDto,
  RegisterDto,
  BootstrapDto,
  AcceptInviteDto,
} from '@/types'

export const authApi = {
  register: (data: RegisterDto) => apiClient.post<ApiResponse<AuthPayload>>('/auth/register', data),

  login: (data: LoginDto) => apiClient.post<ApiResponse<AuthPayload>>('/auth/login', data),

  logout: (signal?: AbortSignal) =>
    apiClient.post<ApiResponse<null>>('/auth/logout', null, { signal }),

  bootstrap: (data: BootstrapDto) =>
    apiClient.post<ApiResponse<AuthPayload>>('/auth/bootstrap', data),

  acceptInvite: (data: AcceptInviteDto) =>
    apiClient.post<ApiResponse<AuthPayload>>('/invites/accept-invite', data),
}

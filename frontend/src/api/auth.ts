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

  // `undefined`, not `null` — axios sends no body at all for `undefined`, whereas
  // `null` serializes to the JSON literal "null", which express.json()'s strict
  // mode rejects (only a top-level object/array is valid). That 400 was silently
  // swallowed by AuthProvider's logout (no catch, only finally), so the button
  // *looked* like it worked while the server request never actually landed and
  // the session was never revoked.
  logout: (signal?: AbortSignal) =>
    apiClient.post<ApiResponse<null>>('/auth/logout', undefined, { signal }),

  bootstrap: (data: BootstrapDto) =>
    apiClient.post<ApiResponse<AuthPayload>>('/auth/bootstrap', data),

  acceptInvite: (data: AcceptInviteDto) =>
    apiClient.post<ApiResponse<AuthPayload>>('/invites/accept-invite', data),
}

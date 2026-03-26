import apiClient from '@/lib/axios'
import type { ApiResponse, SafeUser, UpdateUserDto, Pagination } from '@/types'

export interface ListUsersParams {
  page?: number
  pageSize?: number
}

export interface ListUsersResponse {
  users: SafeUser[]
  pagination: Pagination
}

export const usersApi = {
  list: (params?: ListUsersParams) =>
    apiClient.get<ApiResponse<ListUsersResponse>>('/users', { params }),

  getMe: () =>
    apiClient.get<ApiResponse<SafeUser>>('/users/me'),

  getById: (userId: string) =>
    apiClient.get<ApiResponse<SafeUser>>(`/users/${userId}`),

  update: (userId: string, data: UpdateUserDto) =>
    apiClient.patch<ApiResponse<SafeUser>>(`/users/${userId}`, data),

  replace: (userId: string, data: UpdateUserDto) =>
    apiClient.put<ApiResponse<SafeUser>>(`/users/${userId}`, data),

  deactivate: (userId: string) =>
    apiClient.delete<ApiResponse<SafeUser>>(`/users/${userId}`),
}

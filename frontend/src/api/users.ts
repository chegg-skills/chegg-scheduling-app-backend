import apiClient from '@/lib/axios'
import type { ApiResponse, SafeUser, UserWithDetails, UpdateUserDto, Pagination } from '@/types'

export interface ListUsersParams {
  page?: number
  pageSize?: number
  search?: string
}

export interface ListUsersResponse {
  users: SafeUser[]
  pagination: Pagination
}

export const usersApi = {
  list: (params?: ListUsersParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListUsersResponse>>('/users', { params, signal }),

  getMe: (signal?: AbortSignal) => apiClient.get<ApiResponse<SafeUser>>('/users/me', { signal }),

  updateMe: (data: Partial<UpdateUserDto>) =>
    apiClient.patch<ApiResponse<SafeUser>>('/users/me', data),

  getById: (userId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<UserWithDetails>>(`/users/${userId}`, { signal }),

  update: (userId: string, data: UpdateUserDto) =>
    apiClient.patch<ApiResponse<SafeUser>>(`/users/${userId}`, data),

  replace: (userId: string, data: UpdateUserDto) =>
    apiClient.put<ApiResponse<SafeUser>>(`/users/${userId}`, data),

  deactivate: (userId: string) => apiClient.delete<ApiResponse<SafeUser>>(`/users/${userId}`),
}

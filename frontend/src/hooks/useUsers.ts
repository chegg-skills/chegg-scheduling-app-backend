import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type ListUsersParams } from '@/api/users'
import type { UpdateUserDto, UserWithDetails } from '@/types'
import { invalidateQueryKeys, preservePreviousData } from './queryUtils'
import { statsKeys } from './useStats'

export const userKeys = {
  all: ['users'] as const,
  list: (params?: ListUsersParams) => [...userKeys.all, 'list', params] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  me: () => [...userKeys.all, 'me'] as const,
}

export function useUsers(params?: ListUsersParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => usersApi.list(params, signal).then((r) => r.data.data),
    placeholderData: preservePreviousData,
  })
}

export function useUser(userId: string) {
  return useQuery<UserWithDetails | undefined>({
    queryKey: userKeys.detail(userId),
    queryFn: ({ signal }) => usersApi.getById(userId, signal).then((r) => r.data.data),
    enabled: !!userId,
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) =>
      usersApi.update(userId, data),
    onSuccess: (_, { userId }) =>
      invalidateQueryKeys(qc, [userKeys.all, userKeys.detail(userId), statsKeys.all]),
  })
}

export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<UpdateUserDto>) => usersApi.updateMe(data),
    onSuccess: async (response) => {
      const updatedUser = response.data.data
      await invalidateQueryKeys(qc, [userKeys.all, userKeys.me(), statsKeys.all])

      if (updatedUser?.id) {
        await invalidateQueryKeys(qc, [userKeys.detail(updatedUser.id)])
      }
    },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => usersApi.deactivate(userId),
    onSuccess: () => invalidateQueryKeys(qc, [userKeys.all, statsKeys.all]),
  })
}

export function useReplaceUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) =>
      usersApi.replace(userId, data),
    onSuccess: (_, { userId }) =>
      invalidateQueryKeys(qc, [userKeys.all, userKeys.detail(userId), statsKeys.all]),
  })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, type ListUsersParams } from '@/api/users'
import type { UpdateUserDto } from '@/types'

export const userKeys = {
  all: ['users'] as const,
  list: (params?: ListUsersParams) => [...userKeys.all, 'list', params] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  me: () => [...userKeys.all, 'me'] as const,
}

export function useUsers(params?: ListUsersParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => usersApi.list(params).then((r) => r.data.data),
  })
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => usersApi.getById(userId).then((r) => r.data.data),
    enabled: !!userId,
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) =>
      usersApi.update(userId, data),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: userKeys.all })
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
    },
  })
}

export function useUpdateMyProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<UpdateUserDto>) => usersApi.updateMe(data),
    onSuccess: (response) => {
      const updatedUser = response.data.data
      qc.invalidateQueries({ queryKey: userKeys.all })
      qc.invalidateQueries({ queryKey: userKeys.me() })
      if (updatedUser?.id) {
        qc.invalidateQueries({ queryKey: userKeys.detail(updatedUser.id) })
      }
    },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => usersApi.deactivate(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useReplaceUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserDto }) =>
      usersApi.replace(userId, data),
    onSuccess: (_, { userId }) => {
      qc.invalidateQueries({ queryKey: userKeys.all })
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) })
    },
  })
}

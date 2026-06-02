import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionTypesApi } from '@/api/sessionTypes'
import type { CreateSessionTypeDto, UpdateSessionTypeDto } from '@/types'
import { invalidateQueryKeys } from '../queryUtils'

export const sessionTypeKeys = {
  all: ['session-types'] as const,
  list: () => [...sessionTypeKeys.all, 'list'] as const,
  detail: (id: string) => [...sessionTypeKeys.all, 'detail', id] as const,
}

export function useSessionTypes() {
  return useQuery({
    queryKey: sessionTypeKeys.list(),
    queryFn: ({ signal }) =>
      sessionTypesApi.list(signal).then((r) => r.data.data?.sessionTypes ?? []),
  })
}

export function useSessionType(id: string) {
  return useQuery({
    queryKey: sessionTypeKeys.detail(id),
    queryFn: ({ signal }) =>
      sessionTypesApi.getById(id, signal).then((r) => r.data.data?.sessionType ?? null),
    enabled: !!id,
  })
}

export function useCreateSessionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSessionTypeDto) => sessionTypesApi.create(data),
    onSuccess: () => invalidateQueryKeys(qc, [sessionTypeKeys.all]),
  })
}

export function useUpdateSessionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionTypeId, data }: { sessionTypeId: string; data: UpdateSessionTypeDto }) =>
      sessionTypesApi.update(sessionTypeId, data),
    onSuccess: () => invalidateQueryKeys(qc, [sessionTypeKeys.all]),
  })
}

export function useDeleteSessionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionTypeId: string) => sessionTypesApi.delete(sessionTypeId),
    onSuccess: () => invalidateQueryKeys(qc, [sessionTypeKeys.all]),
  })
}

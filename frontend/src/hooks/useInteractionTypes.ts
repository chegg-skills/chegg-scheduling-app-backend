import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interactionTypesApi } from '@/api/interactionTypes'
import type { CreateInteractionTypeDto, UpdateInteractionTypeDto } from '@/types'
import { invalidateQueryKeys } from './queryUtils'
import { statsKeys } from './useStats'

export const interactionTypeKeys = {
  all: ['interaction-types'] as const,
  list: () => [...interactionTypeKeys.all, 'list'] as const,
}

export function useInteractionTypes() {
  return useQuery({
    queryKey: interactionTypeKeys.list(),
    queryFn: () => interactionTypesApi.list().then((r) => r.data.data),
  })
}

export function useCreateInteractionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInteractionTypeDto) => interactionTypesApi.create(data),
    onSuccess: () => invalidateQueryKeys(qc, [interactionTypeKeys.all, statsKeys.all]),
  })
}

export function useUpdateInteractionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      interactionTypeId,
      data,
    }: {
      interactionTypeId: string
      data: UpdateInteractionTypeDto
    }) => interactionTypesApi.update(interactionTypeId, data),
    onSuccess: () => invalidateQueryKeys(qc, [interactionTypeKeys.all, statsKeys.all]),
  })
}

export function useDeleteInteractionType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (interactionTypeId: string) => interactionTypesApi.delete(interactionTypeId),
    onSuccess: () => invalidateQueryKeys(qc, [interactionTypeKeys.all, statsKeys.all]),
  })
}

export function useInteractionTypeUsage(interactionTypeId: string) {
  return useQuery({
    queryKey: [...interactionTypeKeys.all, interactionTypeId, 'usage'],
    queryFn: () => interactionTypesApi.getUsage(interactionTypeId).then((r) => r.data.data),
    enabled: !!interactionTypeId,
  })
}

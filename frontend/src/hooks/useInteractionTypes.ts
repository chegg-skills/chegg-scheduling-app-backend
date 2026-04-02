import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interactionTypesApi } from '@/api/interactionTypes'
import type { CreateInteractionTypeDto, UpdateInteractionTypeDto } from '@/types'
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: interactionTypeKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: interactionTypeKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

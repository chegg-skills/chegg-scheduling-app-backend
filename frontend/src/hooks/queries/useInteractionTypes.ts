import { useQuery } from '@tanstack/react-query'
import { interactionTypesApi } from '@/api/interactionTypes'

export const interactionTypeKeys = {
  all: ['interaction-types'] as const,
  list: () => [...interactionTypeKeys.all, 'list'] as const,
}

export function useInteractionTypes() {
  return useQuery({
    queryKey: interactionTypeKeys.list(),
    queryFn: ({ signal }) => interactionTypesApi.list(signal).then((r) => r.data.data),
  })
}

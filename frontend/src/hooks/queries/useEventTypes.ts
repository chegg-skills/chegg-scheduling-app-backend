import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventTypesApi } from '@/api/eventTypes'
import type { CreateEventTypeDto, UpdateEventTypeDto } from '@/types'
import { invalidateQueryKeys } from '../queryUtils'
import { statsKeys } from './useStats'

export const eventTypeKeys = {
  all: ['event-types'] as const,
  list: () => [...eventTypeKeys.all, 'list'] as const,
}

export function useEventTypes() {
  return useQuery({
    queryKey: eventTypeKeys.list(),
    queryFn: ({ signal }) => eventTypesApi.list(signal).then((r) => r.data.data?.eventTypes ?? []),
  })
}

export function useCreateEventType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventTypeDto) => eventTypesApi.create(data),
    onSuccess: () => invalidateQueryKeys(qc, [eventTypeKeys.all, statsKeys.all]),
  })
}

export function useUpdateEventType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventTypeId, data }: { eventTypeId: string; data: UpdateEventTypeDto }) =>
      eventTypesApi.update(eventTypeId, data),
    onSuccess: () => invalidateQueryKeys(qc, [eventTypeKeys.all, statsKeys.all]),
  })
}

export function useDeleteEventType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventTypeId: string) => eventTypesApi.delete(eventTypeId),
    onSuccess: () => invalidateQueryKeys(qc, [eventTypeKeys.all, statsKeys.all]),
  })
}

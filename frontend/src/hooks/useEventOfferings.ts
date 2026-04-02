import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventOfferingsApi } from '@/api/eventOfferings'
import type { CreateEventOfferingDto, UpdateEventOfferingDto } from '@/types'
import { statsKeys } from './useStats'

export const offeringKeys = {
  all: ['event-offerings'] as const,
  list: () => [...offeringKeys.all, 'list'] as const,
}

export function useEventOfferings() {
  return useQuery({
    queryKey: offeringKeys.list(),
    queryFn: () => eventOfferingsApi.list().then((r) => r.data.data),
  })
}

export function useCreateEventOffering() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventOfferingDto) => eventOfferingsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offeringKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

export function useUpdateEventOffering() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      offeringId,
      data,
    }: {
      offeringId: string
      data: UpdateEventOfferingDto
    }) => eventOfferingsApi.update(offeringId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offeringKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

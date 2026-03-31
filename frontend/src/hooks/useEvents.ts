import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, type ListEventsParams } from '@/api/events'
import type { CreateEventDto, UpdateEventDto, SetEventHostsDto } from '@/types'

export const eventKeys = {
  all: ['events'] as const,
  byTeam: (teamId: string, params?: ListEventsParams) =>
    [...eventKeys.all, 'team', teamId, params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  hosts: (id: string) => [...eventKeys.all, 'hosts', id] as const,
}

export function useTeamEvents(teamId: string, params?: ListEventsParams) {
  return useQuery({
    queryKey: eventKeys.byTeam(teamId, params),
    queryFn: () => eventsApi.listByTeam(teamId, params).then((r) => r.data.data),
    enabled: !!teamId,
  })
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => eventsApi.getById(eventId).then((r) => r.data.data),
    enabled: !!eventId,
  })
}

export function useCreateEvent(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventDto) => eventsApi.create(teamId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: UpdateEventDto }) =>
      eventsApi.update(eventId, data),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.all })
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => eventsApi.delete(eventId),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  })
}

export function useEventHosts(eventId: string) {
  return useQuery({
    queryKey: eventKeys.hosts(eventId),
    queryFn: () => eventsApi.listHosts(eventId).then((r) => r.data.data),
    enabled: !!eventId,
  })
}

export function useSetEventHosts(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetEventHostsDto) => eventsApi.setHosts(eventId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.hosts(eventId) })
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}

export function useRemoveEventHost(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => eventsApi.removeHost(eventId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.hosts(eventId) })
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}

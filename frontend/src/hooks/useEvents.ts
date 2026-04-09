import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, type ListEventsParams } from '@/api/events'
import type { CreateEventDto, UpdateEventDto, SetEventHostsDto } from '@/types'
import { invalidateQueryKeys } from './queryUtils'
import { statsKeys } from './useStats'

export const eventKeys = {
  all: ['events'] as const,
  list: (params?: ListEventsParams) => [...eventKeys.all, 'list', params] as const,
  byTeam: (teamId: string, params?: ListEventsParams) =>
    [...eventKeys.all, 'team', teamId, params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  hosts: (id: string) => [...eventKeys.all, 'hosts', id] as const,
  scheduleSlots: (id: string) => [...eventKeys.all, 'schedule-slots', id] as const,
}

export function useEvents(params?: ListEventsParams) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: ({ signal }) => eventsApi.listAll(signal).then((r) => r.data.data),
  })
}

export function useEventScheduleSlots(eventId: string) {
  return useQuery({
    queryKey: eventKeys.scheduleSlots(eventId),
    queryFn: ({ signal }) => eventsApi.listScheduleSlots(eventId, signal).then((r) => r.data.data),
    enabled: !!eventId,
  })
}

export function useCreateEventScheduleSlot(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => eventsApi.createScheduleSlot(eventId, data),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.scheduleSlots(eventId), eventKeys.detail(eventId)]),
  })
}

export function useUpdateEventScheduleSlot(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ slotId, data }: { slotId: string; data: any }) =>
      eventsApi.updateScheduleSlot(eventId, slotId, data),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.scheduleSlots(eventId), eventKeys.detail(eventId)]),
  })
}

export function useDeleteEventScheduleSlot(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slotId: string) => eventsApi.deleteScheduleSlot(eventId, slotId),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.scheduleSlots(eventId), eventKeys.detail(eventId)]),
  })
}

export function useTeamEvents(teamId: string, params?: ListEventsParams) {
  return useQuery({
    queryKey: eventKeys.byTeam(teamId, params),
    queryFn: ({ signal }) => eventsApi.listByTeam(teamId, params, signal).then((r) => r.data.data),
    enabled: !!teamId,
  })
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: ({ signal }) => eventsApi.getById(eventId, signal).then((r) => r.data.data),
    enabled: !!eventId,
  })
}

export function useCreateEvent(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventDto) => eventsApi.create(teamId, data),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.all, statsKeys.all]),
  })
}

export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: UpdateEventDto }) =>
      eventsApi.update(eventId, data),
    onSuccess: (_, { eventId }) =>
      invalidateQueryKeys(qc, [eventKeys.all, eventKeys.detail(eventId), statsKeys.all]),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => eventsApi.delete(eventId),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.all, statsKeys.all]),
  })
}

export function useDuplicateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: string) => eventsApi.duplicate(eventId),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.all, statsKeys.all]),
  })
}

export function useEventHosts(eventId: string) {
  return useQuery({
    queryKey: eventKeys.hosts(eventId),
    queryFn: ({ signal }) => eventsApi.listHosts(eventId, signal).then((r) => r.data.data),
    enabled: !!eventId,
  })
}

export function useSetEventHosts(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetEventHostsDto) => eventsApi.setHosts(eventId, data),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.hosts(eventId), eventKeys.detail(eventId), statsKeys.all]),
  })
}

export function useRemoveEventHost(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => eventsApi.removeHost(eventId, userId),
    onSuccess: () => invalidateQueryKeys(qc, [eventKeys.hosts(eventId), eventKeys.detail(eventId), statsKeys.all]),
  })
}

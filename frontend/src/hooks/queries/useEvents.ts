import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { eventsApi, type ListEventsParams } from '@/api/events'
import type { CreateEventDto, UpdateEventDto, SetEventCoachesDto, UpsertSessionLogDto } from '@/types'
import { invalidateQueryKeys } from '../queryUtils'
import { statsKeys } from './useStats'

export const eventKeys = {
  all: ['events'] as const,
  list: (params?: ListEventsParams) => [...eventKeys.all, 'list', params] as const,
  byTeam: (teamId: string, params?: ListEventsParams) =>
    [...eventKeys.all, 'team', teamId, params] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  coaches: (id: string) => [...eventKeys.all, 'coaches', id] as const,
  scheduleSlots: (id: string) => [...eventKeys.all, 'schedule-slots', id] as const,
  slotBookings: (eventId: string, slotId: string) =>
    [...eventKeys.scheduleSlots(eventId), 'bookings', slotId] as const,
  slotLog: (eventId: string, slotId: string) =>
    [...eventKeys.scheduleSlots(eventId), 'log', slotId] as const,
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

export function useSlotBookings(eventId: string, slotId: string) {
  return useQuery({
    queryKey: eventKeys.slotBookings(eventId, slotId),
    queryFn: ({ signal }) =>
      eventsApi.listSlotBookings(eventId, slotId, signal).then((r) => r.data.data),
    enabled: !!eventId && !!slotId,
  })
}

export function useCreateEventScheduleSlot(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => eventsApi.createScheduleSlot(eventId, data),
    onSuccess: () =>
      invalidateQueryKeys(qc, [eventKeys.scheduleSlots(eventId), eventKeys.detail(eventId)]),
  })
}

export function useUpdateEventScheduleSlot(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ slotId, data }: { slotId: string; data: any }) =>
      eventsApi.updateScheduleSlot(eventId, slotId, data),
    onSuccess: () =>
      invalidateQueryKeys(qc, [eventKeys.scheduleSlots(eventId), eventKeys.detail(eventId)]),
  })
}

export function useDeleteEventScheduleSlot(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (slotId: string) => eventsApi.deleteScheduleSlot(eventId, slotId),
    onSuccess: () =>
      invalidateQueryKeys(qc, [eventKeys.scheduleSlots(eventId), eventKeys.detail(eventId)]),
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

export function useEventCoaches(eventId: string) {
  return useQuery({
    queryKey: eventKeys.coaches(eventId),
    queryFn: ({ signal }) => eventsApi.listCoaches(eventId, signal).then((r) => r.data.data),
    enabled: !!eventId,
  })
}

export function useSetEventCoaches(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SetEventCoachesDto) => eventsApi.setCoaches(eventId, data),
    onSuccess: () =>
      invalidateQueryKeys(qc, [eventKeys.coaches(eventId), eventKeys.detail(eventId), statsKeys.all]),
  })
}

export function useRemoveEventCoach(eventId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => eventsApi.removeCoach(eventId, userId),
    onSuccess: () =>
      invalidateQueryKeys(qc, [eventKeys.coaches(eventId), eventKeys.detail(eventId), statsKeys.all]),
  })
}

export function useSlotSessionLog(eventId: string, slotId: string) {
  return useQuery({
    queryKey: eventKeys.slotLog(eventId, slotId),
    queryFn: ({ signal }) =>
      eventsApi.getSessionLog(eventId, slotId, signal).then((r) => r.data.data ?? null),
    enabled: !!eventId && !!slotId,
  })
}

export function useUpsertSessionLog(eventId: string, slotId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpsertSessionLogDto) => eventsApi.upsertSessionLog(eventId, slotId, data),
    onSuccess: () =>
      invalidateQueryKeys(qc, [
        eventKeys.slotLog(eventId, slotId),
        eventKeys.slotBookings(eventId, slotId),
      ]),
  })
}

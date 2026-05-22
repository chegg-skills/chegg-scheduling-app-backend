import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  eventGroupsApi,
  type CreateEventGroupDto,
  type UpdateEventGroupDto,
} from '@/api/eventGroups'
import { invalidateQueryKeys } from '../queryUtils'
import { eventKeys } from './useEvents'

export const eventGroupKeys = {
  all: ['event-groups'] as const,
  byTeam: (teamId: string) => [...eventGroupKeys.all, 'team', teamId] as const,
  detail: (groupId: string) => [...eventGroupKeys.all, 'detail', groupId] as const,
}

export function useTeamEventGroups(teamId: string) {
  return useQuery({
    queryKey: eventGroupKeys.byTeam(teamId),
    queryFn: ({ signal }) =>
      eventGroupsApi.listByTeam(teamId, signal).then((r) => r.data.data?.groups ?? []),
    enabled: !!teamId,
  })
}

export function useCreateEventGroup(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateEventGroupDto) => eventGroupsApi.create(teamId, data),
    onSuccess: () => invalidateQueryKeys(qc, [eventGroupKeys.byTeam(teamId), eventKeys.all]),
  })
}

export function useUpdateEventGroup(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: UpdateEventGroupDto }) =>
      eventGroupsApi.update(groupId, data),
    onSuccess: (_, { groupId }) =>
      invalidateQueryKeys(qc, [
        eventGroupKeys.byTeam(teamId),
        eventGroupKeys.detail(groupId),
        eventKeys.all,
      ]),
  })
}

export function useDeleteEventGroup(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => eventGroupsApi.remove(groupId),
    onSuccess: () => invalidateQueryKeys(qc, [eventGroupKeys.byTeam(teamId), eventKeys.all]),
  })
}

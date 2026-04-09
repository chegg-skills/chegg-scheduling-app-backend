import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamMembersApi } from '@/api/teamMembers'
import { invalidateQueryKeys } from './queryUtils'

export const memberKeys = {
  all: ['team-members'] as const,
  byTeam: (teamId: string) => [...memberKeys.all, 'team', teamId] as const,
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: memberKeys.byTeam(teamId),
    queryFn: ({ signal }) => teamMembersApi.list(teamId, signal).then((r) => r.data.data),
    enabled: !!teamId,
  })
}

export function useAddTeamMember(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userIds: string | string[]) => teamMembersApi.add(teamId, userIds),
    onSuccess: () => invalidateQueryKeys(qc, [memberKeys.byTeam(teamId)]),
  })
}

export function useRemoveTeamMember(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => teamMembersApi.remove(teamId, userId),
    onSuccess: () => invalidateQueryKeys(qc, [memberKeys.byTeam(teamId)]),
  })
}

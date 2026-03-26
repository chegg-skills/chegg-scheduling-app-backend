import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamMembersApi } from '@/api/teamMembers'

export const memberKeys = {
  all: ['team-members'] as const,
  byTeam: (teamId: string) => [...memberKeys.all, 'team', teamId] as const,
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: memberKeys.byTeam(teamId),
    queryFn: () => teamMembersApi.list(teamId).then((r) => r.data.data),
    enabled: !!teamId,
  })
}

export function useAddTeamMember(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => teamMembersApi.add(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.byTeam(teamId) }),
  })
}

export function useRemoveTeamMember(teamId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => teamMembersApi.remove(teamId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.byTeam(teamId) }),
  })
}

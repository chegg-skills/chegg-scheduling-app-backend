import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi, type ListTeamsParams } from '@/api/teams'
import type { CreateTeamDto, UpdateTeamDto } from '@/types'
import { memberKeys } from './useTeamMembers'
import { statsKeys } from './useStats'

export const teamKeys = {
  all: ['teams'] as const,
  list: (params?: ListTeamsParams) => [...teamKeys.all, 'list', params] as const,
  detail: (id: string) => [...teamKeys.all, 'detail', id] as const,
}

export function useTeams(params?: ListTeamsParams) {
  return useQuery({
    queryKey: teamKeys.list(params),
    queryFn: () => teamsApi.list(params).then((r) => r.data.data),
  })
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: () => teamsApi.getById(teamId).then((r) => r.data.data),
    enabled: !!teamId,
  })
}

export function useCreateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTeamDto) => teamsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

export function useUpdateTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teamId, data }: { teamId: string; data: UpdateTeamDto }) =>
      teamsApi.update(teamId, data),
    onSuccess: (_, { teamId }) => {
      qc.invalidateQueries({ queryKey: teamKeys.all })
      qc.invalidateQueries({ queryKey: teamKeys.detail(teamId) })
      qc.invalidateQueries({ queryKey: memberKeys.byTeam(teamId) })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

export function useDeleteTeam() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (teamId: string) => teamsApi.delete(teamId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teamKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

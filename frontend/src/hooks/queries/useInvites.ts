import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invitesApi } from '@/api/invites'
import type { CreateInviteDto, ListInvitesParams } from '@/types'
import { invalidateQueryKeys } from '../queryUtils'
import { userKeys } from './useUsers'
import { statsKeys } from './useStats'

export const inviteKeys = {
  all: ['invites'] as const,
  list: (params?: ListInvitesParams) => [...inviteKeys.all, 'list', params] as const,
}

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInviteDto) => invitesApi.create(data),
    onSuccess: () => invalidateQueryKeys(qc, [userKeys.all, statsKeys.all, inviteKeys.all]),
  })
}

export function useInvites(params?: ListInvitesParams) {
  return useQuery({
    queryKey: inviteKeys.list(params),
    queryFn: () => invitesApi.list(params).then((r) => r.data.data),
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invitesApi.revoke(id),
    onSuccess: () => invalidateQueryKeys(qc, [inviteKeys.all, statsKeys.all]),
  })
}

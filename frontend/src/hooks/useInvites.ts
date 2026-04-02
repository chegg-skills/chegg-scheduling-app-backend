import { useMutation, useQueryClient } from '@tanstack/react-query'
import { invitesApi } from '@/api/invites'
import type { CreateInviteDto } from '@/types'
import { userKeys } from './useUsers'
import { statsKeys } from './useStats'

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInviteDto) => invitesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.all })
      qc.invalidateQueries({ queryKey: statsKeys.all })
    },
  })
}

import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/api/public'

export const useSlotJoinInfo = (slotId: string, token: string) =>
  useQuery({
    queryKey: ['slotJoinInfo', slotId, token],
    queryFn: ({ signal }) => publicApi.getSlotJoinInfo(slotId, token, signal).then((r) => r.data.data),
    enabled: Boolean(slotId && token),
    retry: false,
    staleTime: Infinity,
  })

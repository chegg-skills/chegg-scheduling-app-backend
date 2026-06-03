import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { systemSettingsApi } from '@/api/systemSettings'
import type { SystemSettings } from '@/types'

export const systemSettingsKeys = {
  all: ['system-settings'] as const,
}

export function useSystemSettings() {
  return useQuery({
    queryKey: systemSettingsKeys.all,
    queryFn: ({ signal }) =>
      systemSettingsApi.get(signal).then((r) => r.data.data?.settings ?? { feedbackFormLink: '' }),
  })
}

export function useUpdateSystemSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<SystemSettings>) => systemSettingsApi.update(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: systemSettingsKeys.all })
    },
  })
}

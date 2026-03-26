import { useQuery } from '@tanstack/react-query'
import { configApi } from '@/api/config'

export const configKeys = {
    all: ['config'] as const,
    timezones: () => [...configKeys.all, 'timezones'] as const,
}

export function useTimezones() {
    return useQuery({
        queryKey: configKeys.timezones(),
        queryFn: () => configApi.getTimezones().then((r) => r.data?.data?.timezones ?? []),
        staleTime: Infinity,
    })
}

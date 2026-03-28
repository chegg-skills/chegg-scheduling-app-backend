import { useQuery } from '@tanstack/react-query'
import { configApi } from '@/api/config'

export const configKeys = {
    all: ['config'] as const,
    timezones: () => [...configKeys.all, 'timezones'] as const,
    countries: () => [...configKeys.all, 'countries'] as const,
    languages: () => [...configKeys.all, 'languages'] as const,
}

export function useLanguages() {
    return useQuery({
        queryKey: configKeys.languages(),
        queryFn: () => configApi.getLanguages().then((r) => r.data?.data?.languages ?? []),
        staleTime: Infinity,
    })
}

export function useCountries() {
    return useQuery({
        queryKey: configKeys.countries(),
        queryFn: () => configApi.getCountries().then((r) => r.data?.data?.countries ?? []),
        staleTime: Infinity,
    })
}

export function useTimezones() {
    return useQuery({
        queryKey: configKeys.timezones(),
        queryFn: () => configApi.getTimezones().then((r) => r.data?.data?.timezones ?? []),
        staleTime: Infinity,
    })
}

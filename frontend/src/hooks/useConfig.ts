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
        queryFn: ({ signal }) => configApi.getLanguages(signal).then((r) => r.data?.data?.languages ?? []),
        staleTime: Infinity,
    })
}

export function useCountries() {
    return useQuery({
        queryKey: configKeys.countries(),
        queryFn: ({ signal }) => configApi.getCountries(signal).then((r) => r.data?.data?.countries ?? []),
        staleTime: Infinity,
    })
}

export function useTimezones() {
    return useQuery({
        queryKey: configKeys.timezones(),
        queryFn: ({ signal }) => configApi.getTimezones(signal).then((r) => r.data?.data?.timezones ?? []),
        staleTime: Infinity,
    })
}

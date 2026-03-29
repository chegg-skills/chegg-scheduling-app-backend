import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/api/public'

export const publicKeys = {
    all: ['public'] as const,
    teams: () => [...publicKeys.all, 'teams'] as const,
    events: (teamId: string) => [...publicKeys.all, 'events', teamId] as const,
    slots: (eventId: string, start: string, end: string) =>
        [...publicKeys.all, 'slots', eventId, start, end] as const,
}

export function usePublicTeams() {
    return useQuery({
        queryKey: publicKeys.teams(),
        queryFn: () => publicApi.listTeams().then(r => r.data.data?.teams ?? []),
    })
}

export function usePublicTeamEvents(teamId: string) {
    return useQuery({
        queryKey: publicKeys.events(teamId),
        queryFn: () => publicApi.listTeamEvents(teamId).then(r => r.data.data?.events ?? []),
        enabled: !!teamId,
    })
}

export function usePublicSlots(eventId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: publicKeys.slots(eventId, startDate, endDate),
        queryFn: () => publicApi.getAvailableSlots(eventId, startDate, endDate).then(r => r.data.data?.slots ?? []),
        enabled: !!eventId && !!startDate && !!endDate,
    })
}

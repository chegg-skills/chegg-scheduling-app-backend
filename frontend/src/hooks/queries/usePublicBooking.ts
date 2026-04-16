import { useQuery } from '@tanstack/react-query'
import { publicApi } from '@/api/public'

export const publicKeys = {
  all: ['public'] as const,
  teams: () => [...publicKeys.all, 'teams'] as const,
  team: (slug: string) => [...publicKeys.all, 'team', slug] as const,
  events: (teamId: string) => [...publicKeys.all, 'events', teamId] as const,
  teamEventsBySlug: (slug: string) => [...publicKeys.all, 'team-events', slug] as const,
  event: (slug: string) => [...publicKeys.all, 'event', slug] as const,
  coach: (slug: string) => [...publicKeys.all, 'coach', slug] as const,
  coachEvents: (slug: string) => [...publicKeys.all, 'coach-events', slug] as const,
  slots: (eventId: string, start: string, end: string, preferredHostId?: string) =>
    [...publicKeys.all, 'slots', eventId, start, end, preferredHostId ?? 'any'] as const,
}

export function usePublicTeams() {
  return useQuery({
    queryKey: publicKeys.teams(),
    queryFn: ({ signal }) =>
      publicApi.listTeams(signal).then((response) => response.data.data?.teams ?? []),
  })
}

export function usePublicTeamBySlug(slug: string) {
  return useQuery({
    queryKey: publicKeys.team(slug),
    queryFn: ({ signal }) =>
      publicApi.getTeamBySlug(slug, signal).then((response) => response.data.data?.team ?? null),
    enabled: !!slug,
  })
}

export function usePublicTeamEvents(teamId: string) {
  return useQuery({
    queryKey: publicKeys.events(teamId),
    queryFn: ({ signal }) =>
      publicApi.listTeamEvents(teamId, signal).then((response) => response.data.data?.events ?? []),
    enabled: !!teamId,
  })
}

export function usePublicTeamEventsBySlug(slug: string) {
  return useQuery({
    queryKey: publicKeys.teamEventsBySlug(slug),
    queryFn: ({ signal }) =>
      publicApi.listTeamEventsBySlug(slug, signal).then((response) => response.data.data ?? null),
    enabled: !!slug,
  })
}

export function usePublicEventBySlug(slug: string) {
  return useQuery({
    queryKey: publicKeys.event(slug),
    queryFn: ({ signal }) =>
      publicApi.getEventBySlug(slug, signal).then((response) => response.data.data?.event ?? null),
    enabled: !!slug,
  })
}

export function usePublicCoachBySlug(slug: string) {
  return useQuery({
    queryKey: publicKeys.coach(slug),
    queryFn: ({ signal }) =>
      publicApi.getCoachBySlug(slug, signal).then((response) => response.data.data?.coach ?? null),
    enabled: !!slug,
  })
}

export function usePublicCoachEventsBySlug(slug: string) {
  return useQuery({
    queryKey: publicKeys.coachEvents(slug),
    queryFn: ({ signal }) =>
      publicApi.listCoachEventsBySlug(slug, signal).then((response) => response.data.data ?? null),
    enabled: !!slug,
  })
}

export function usePublicSlots(
  eventId: string,
  startDate: string,
  endDate: string,
  preferredHostId?: string
) {
  return useQuery({
    queryKey: publicKeys.slots(eventId, startDate, endDate, preferredHostId),
    queryFn: ({ signal }) =>
      publicApi
        .getAvailableSlots(eventId, startDate, endDate, preferredHostId, signal)
        .then((response) => response.data.data?.slots ?? []),
    enabled: !!eventId && !!startDate && !!endDate,
  })
}

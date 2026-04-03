import apiClient from '@/lib/axios'
import type {
    ApiResponse,
    PublicCoachSummary,
    PublicEventSummary,
    PublicTeamSummary,
} from '@/types'

export interface ListPublicTeamsResponse {
    teams: PublicTeamSummary[]
}

export interface GetPublicTeamResponse {
    team: PublicTeamSummary
}

export interface GetPublicEventResponse {
    event: PublicEventSummary
}

export interface GetPublicCoachResponse {
    coach: PublicCoachSummary
}

export interface ListPublicEventsResponse {
    events: PublicEventSummary[]
}

export interface ListCoachEventsResponse {
    coach: PublicCoachSummary
    events: PublicEventSummary[]
}

export interface ListTeamEventsBySlugResponse {
    team: PublicTeamSummary
    events: PublicEventSummary[]
}

export interface ListSlotsResponse {
    slots: string[]
}

export const publicApi = {
    listTeams: () =>
        apiClient.get<ApiResponse<ListPublicTeamsResponse>>('/public/teams'),

    getTeamBySlug: (slug: string) =>
        apiClient.get<ApiResponse<GetPublicTeamResponse>>(`/public/teams/slug/${slug}`),

    listTeamEvents: (teamId: string) =>
        apiClient.get<ApiResponse<ListPublicEventsResponse>>(`/public/teams/${teamId}/events`),

    listTeamEventsBySlug: (slug: string) =>
        apiClient.get<ApiResponse<ListTeamEventsBySlugResponse>>(`/public/teams/slug/${slug}/events`),

    getEventBySlug: (slug: string) =>
        apiClient.get<ApiResponse<GetPublicEventResponse>>(`/public/events/slug/${slug}`),

    getCoachBySlug: (slug: string) =>
        apiClient.get<ApiResponse<GetPublicCoachResponse>>(`/public/coaches/slug/${slug}`),

    listCoachEventsBySlug: (slug: string) =>
        apiClient.get<ApiResponse<ListCoachEventsResponse>>(`/public/coaches/slug/${slug}/events`),

    getAvailableSlots: (eventId: string, startDate: string, endDate: string, preferredHostId?: string) =>
        apiClient.get<ApiResponse<ListSlotsResponse>>(`/public/events/${eventId}/slots`, {
            params: { startDate, endDate, preferredHostId }
        }),
}

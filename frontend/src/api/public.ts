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

export interface AvailableSlot {
    startTime: string;
    endTime: string;
    scheduleSlotId?: string;
    remainingSeats?: number | null;
    maxSeats?: number | null;
}

export interface ListSlotsResponse {
    slots: AvailableSlot[]
}

export const publicApi = {
    listTeams: (signal?: AbortSignal) =>
        apiClient.get<ApiResponse<ListPublicTeamsResponse>>('/public/teams', { signal }),

    getTeamBySlug: (slug: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<GetPublicTeamResponse>>(`/public/teams/slug/${slug}`, { signal }),

    listTeamEvents: (teamId: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<ListPublicEventsResponse>>(`/public/teams/${teamId}/events`, { signal }),

    listTeamEventsBySlug: (slug: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<ListTeamEventsBySlugResponse>>(`/public/teams/slug/${slug}/events`, { signal }),

    getEventBySlug: (slug: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<GetPublicEventResponse>>(`/public/events/slug/${slug}`, { signal }),

    getCoachBySlug: (slug: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<GetPublicCoachResponse>>(`/public/coaches/slug/${slug}`, { signal }),

    listCoachEventsBySlug: (slug: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<ListCoachEventsResponse>>(`/public/coaches/slug/${slug}/events`, { signal }),

    getAvailableSlots: (eventId: string, startDate: string, endDate: string, preferredHostId?: string, signal?: AbortSignal) =>
        apiClient.get<ApiResponse<ListSlotsResponse>>(`/public/events/${eventId}/slots`, {
            params: { startDate, endDate, preferredHostId },
            signal
        }),
}

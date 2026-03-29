import apiClient from '@/lib/axios'
import type {
    ApiResponse,
    Team,
    Event,
} from '@/types'

export interface ListPublicTeamsResponse {
    teams: Pick<Team, 'id' | 'name' | 'description'>[]
}

export interface ListPublicEventsResponse {
    events: Pick<Event, 'id' | 'name' | 'description' | 'durationSeconds' | 'locationType'>[]
}

export interface ListSlotsResponse {
    slots: string[]
}

export const publicApi = {
    listTeams: () =>
        apiClient.get<ApiResponse<ListPublicTeamsResponse>>('/public/teams'),

    listTeamEvents: (teamId: string) =>
        apiClient.get<ApiResponse<ListPublicEventsResponse>>(`/public/teams/${teamId}/events`),

    getAvailableSlots: (eventId: string, startDate: string, endDate: string) =>
        apiClient.get<ApiResponse<ListSlotsResponse>>(`/public/events/${eventId}/slots`, {
            params: { startDate, endDate }
        }),
}

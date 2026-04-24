import apiClient from '@/lib/axios'
import type {
  ApiResponse,
  Event,
  EventCoach,
  EventScheduleSlot,
  CreateEventDto,
  UpdateEventDto,
  SetEventCoachesDto,
  Pagination,
  SessionLog,
  UpsertSessionLogDto,
} from '@/types'

export interface ListEventsParams {
  page?: number
  pageSize?: number
}

export interface ListEventsResponse {
  events: Event[]
  pagination: Pagination
}

export const eventsApi = {
  listAll: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListEventsResponse>>('/events', { signal }),
  create: (teamId: string, data: CreateEventDto) =>
    apiClient.post<ApiResponse<Event>>(`/teams/${teamId}/events`, data),
  listByTeam: (teamId: string, params?: ListEventsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<ListEventsResponse>>(`/teams/${teamId}/events`, { params, signal }),
  getById: (eventId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<Event>>(`/events/${eventId}`, { signal }),
  update: (eventId: string, data: UpdateEventDto) =>
    apiClient.patch<ApiResponse<Event>>(`/events/${eventId}`, data),
  delete: (eventId: string) => apiClient.delete<ApiResponse<Event>>(`/events/${eventId}`),
  duplicate: (eventId: string) =>
    apiClient.post<ApiResponse<Event>>(`/events/${eventId}/duplicate`),
  listCoaches: (eventId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ coaches: EventCoach[] }>>(`/events/${eventId}/coaches`, { signal }),
  setCoaches: (eventId: string, data: SetEventCoachesDto) =>
    apiClient.put<ApiResponse<{ coaches: EventCoach[] }>>(`/events/${eventId}/coaches`, data),
  removeCoach: (eventId: string, userId: string) =>
    apiClient.delete<ApiResponse<EventCoach>>(`/events/${eventId}/coaches/${userId}`),
  listScheduleSlots: (eventId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<{ slots: EventScheduleSlot[] }>>(
      `/events/${eventId}/schedule-slots`,
      { signal }
    ),
  createScheduleSlot: (eventId: string, data: Partial<EventScheduleSlot>) =>
    apiClient.post<ApiResponse<EventScheduleSlot>>(`/events/${eventId}/schedule-slots`, data),
  updateScheduleSlot: (eventId: string, slotId: string, data: Partial<EventScheduleSlot>) =>
    apiClient.patch<ApiResponse<EventScheduleSlot>>(
      `/events/${eventId}/schedule-slots/${slotId}`,
      data
    ),
  deleteScheduleSlot: (eventId: string, slotId: string) =>
    apiClient.delete<ApiResponse<EventScheduleSlot>>(`/events/${eventId}/schedule-slots/${slotId}`),
  listSlotBookings: (eventId: string, slotId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<any>>(`/events/${eventId}/schedule-slots/${slotId}/bookings`, {
      signal,
    }),
  getSessionLog: (eventId: string, slotId: string, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<SessionLog | null>>(
      `/events/${eventId}/schedule-slots/${slotId}/log`,
      { signal },
    ),
  upsertSessionLog: (eventId: string, slotId: string, data: UpsertSessionLogDto) =>
    apiClient.post<ApiResponse<SessionLog>>(
      `/events/${eventId}/schedule-slots/${slotId}/log`,
      data,
    ),
}

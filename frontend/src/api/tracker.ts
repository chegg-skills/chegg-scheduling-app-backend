import apiClient from '@/lib/axios'
import type { ApiResponse } from '@/types'

export interface TrackerSlot {
  slotId: string
  startTime: string
  endTime: string
  team: { id: string; name: string }
  event: { id: string; name: string }
  eventType: { id: string; name: string } | null
  seriesFrequency: string | null
  seriesSessionNumber: number | null
  seriesTotalCount: number | null
  assignedCoach: { id: string; firstName: string; lastName: string } | null
  bookingCount: number
  capacity: number | null
  remainingSeats: number | null
  status: 'OPEN' | 'FULL'
  isLogged: boolean
}

export interface TrackerFilters {
  teams: { id: string; name: string }[]
  events: { id: string; name: string; teamId: string }[]
}

export interface TrackerSlotsParams {
  date?: string
  teamId?: string
  eventId?: string
}

export const trackerApi = {
  getSlots: (params?: TrackerSlotsParams, signal?: AbortSignal) =>
    apiClient.get<ApiResponse<TrackerSlot[]>>('/v1/tracker/slots', { params, signal }),

  getFilters: (signal?: AbortSignal) =>
    apiClient.get<ApiResponse<TrackerFilters>>('/v1/tracker/filters', { signal }),
}
